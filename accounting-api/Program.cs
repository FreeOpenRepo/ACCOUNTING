using accounting_api.Data;
using accounting_api.Features.Invoices;
using accounting_api.Models;
using accounting_api.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5010");

// Add services
builder.Services.AddOpenApi();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
builder.Services.AddSingleton<ITaxInvoicePdfService, TaxInvoicePdfService>();

// Configure CORS for Next.js frontend (accounting-web)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure Database: PostgreSQL if connection string is configured, otherwise InMemory
var postgresConn = builder.Configuration.GetConnectionString("PostgresConnection");
if (!string.IsNullOrEmpty(postgresConn))
{
    builder.Services.AddDbContext<AccountingDbContext>(opt =>
        opt.UseNpgsql(postgresConn));
}
else
{
    builder.Services.AddDbContext<AccountingDbContext>(opt =>
        opt.UseInMemoryDatabase("AccountingInMemoryDb"));
}

var app = builder.Build();

// Ensure Database is Created & Seeded asynchronously without blocking Kestrel startup
app.Lifetime.ApplicationStarted.Register(async () =>
{
    for (int i = 0; i < 5; i++)
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AccountingDbContext>();
            await db.Database.EnsureCreatedAsync();
            app.Logger.LogInformation("Database connected and verified successfully.");
            break;
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning("Database initialization attempt {Attempt} failed: {Message}. Retrying...", i + 1, ex.Message);
            await Task.Delay(2000);
        }
    }
});

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Health Check
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    system = "02_ACCOUNTING_ENGINE",
    timestamp = DateTime.UtcNow,
    engine = ".NET 10 + MediatR + QuestPDF + EF Core 10"
}));

// Chart of Accounts
app.MapGet("/api/accounts", async (AccountingDbContext db) =>
{
    var accounts = await db.Accounts.OrderBy(a => a.Code).ToListAsync();
    return Results.Ok(accounts);
});

// Invoices CRUD & Workflow
app.MapGet("/api/invoices", async (AccountingDbContext db) =>
{
    var invoices = await db.Invoices
        .Include(i => i.Items)
        .OrderByDescending(i => i.IssueDate)
        .ToListAsync();
    return Results.Ok(invoices);
});

app.MapGet("/api/invoices/{id}", async (int id, AccountingDbContext db) =>
{
    var invoice = await db.Invoices
        .Include(i => i.Items)
        .FirstOrDefaultAsync(i => i.Id == id);
    return invoice != null ? Results.Ok(invoice) : Results.NotFound();
});

// Create Draft Invoice
app.MapPost("/api/invoices", async (CreateInvoiceDto dto, AccountingDbContext db) =>
{
    var count = await db.Invoices.CountAsync();
    var invoiceNumber = $"INV-{DateTime.UtcNow:yyyy}-{(count + 1):D4}";

    var invoice = new Invoice
    {
        InvoiceNumber = invoiceNumber,
        CustomerName = dto.CustomerName,
        CustomerTaxId = dto.CustomerTaxId,
        CustomerAddress = dto.CustomerAddress,
        IssueDate = dto.IssueDate ?? DateTime.UtcNow,
        DueDate = dto.DueDate ?? DateTime.UtcNow.AddDays(30),
        Status = InvoiceStatus.DRAFT,
        Notes = dto.Notes
    };

    foreach (var itemDto in dto.Items)
    {
        invoice.Items.Add(new InvoiceItem
        {
            Description = itemDto.Description,
            Quantity = itemDto.Quantity,
            UnitPrice = itemDto.UnitPrice,
            RevenueAccountId = itemDto.RevenueAccountId > 0 ? itemDto.RevenueAccountId : 8 // Default 4100
        });
    }

    db.Invoices.Add(invoice);
    await db.SaveChangesAsync();

    return Results.Created($"/api/invoices/{invoice.Id}", invoice);
});

// Transition 1: DRAFT -> POSTED (Trigger: POST_INVOICE)
// Validation: Sum(Dr) == Sum(Cr) (StrictDebitCreditEquality)
// Side-effects: QuestPdf.RenderTaxInvoice, Ledger.AppendEntry
app.MapPost("/api/invoices/{id}/post", async (int id, IMediator mediator) =>
{
    try
    {
        var result = await mediator.Send(new PostInvoiceCommand(id));
        return Results.Ok(new
        {
            invoice = result.Invoice,
            journalEntry = result.JournalEntry,
            pdfBase64 = Convert.ToBase64String(result.PdfBytes)
        });
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Transition 2: POSTED -> REVERSED (Trigger: REVERSE_INVOICE)
// Invariant: LedgerImmutabilityNoHardDelete
// Side-effects: Ledger.CreateCounterEntry
app.MapPost("/api/invoices/{id}/reverse", async (int id, ReverseDto dto, IMediator mediator) =>
{
    try
    {
        var result = await mediator.Send(new ReverseInvoiceCommand(id, dto.Reason));
        return Results.Ok(new
        {
            invoice = result.Invoice,
            reversalJournalEntry = result.ReversalJournalEntry
        });
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Stream PDF/A Tax Invoice
app.MapGet("/api/invoices/{id}/pdf", async (int id, AccountingDbContext db, ITaxInvoicePdfService pdfService) =>
{
    var invoice = await db.Invoices
        .Include(i => i.Items)
        .FirstOrDefaultAsync(i => i.Id == id);

    if (invoice == null) return Results.NotFound();

    var pdfBytes = pdfService.GenerateTaxInvoicePdf(invoice);
    return Results.File(pdfBytes, "application/pdf", $"TaxInvoice-{invoice.InvoiceNumber}.pdf");
});

// General Ledger (For Auditor & Accountant)
app.MapGet("/api/ledger", async (AccountingDbContext db) =>
{
    var entries = await db.LedgerEntries
        .OrderByDescending(l => l.EntryDate)
        .ThenByDescending(l => l.Id)
        .ToListAsync();
    return Results.Ok(entries);
});

// Journal Entries
app.MapGet("/api/journal-entries", async (AccountingDbContext db) =>
{
    var entries = await db.JournalEntries
        .Include(j => j.Lines)
        .OrderByDescending(j => j.EntryDate)
        .ThenByDescending(j => j.Id)
        .ToListAsync();
    return Results.Ok(entries);
});

// Trial Balance Statement
app.MapGet("/api/reports/trial-balance", async (AccountingDbContext db) =>
{
    var accounts = await db.Accounts.OrderBy(a => a.Code).ToListAsync();
    var ledger = await db.LedgerEntries.ToListAsync();

    var rows = accounts.Select(a =>
    {
        var accountEntries = ledger.Where(l => l.AccountId == a.Id).ToList();
        var totalDr = accountEntries.Sum(e => e.Debit);
        var totalCr = accountEntries.Sum(e => e.Credit);
        
        decimal debitBalance = 0;
        decimal creditBalance = 0;

        if (a.Type == AccountType.Asset || a.Type == AccountType.Expense)
        {
            var net = totalDr - totalCr;
            if (net >= 0) debitBalance = net;
            else creditBalance = Math.Abs(net);
        }
        else
        {
            var net = totalCr - totalDr;
            if (net >= 0) creditBalance = net;
            else debitBalance = Math.Abs(net);
        }

        return new
        {
            accountCode = a.Code,
            accountName = a.Name,
            accountType = a.Type.ToString(),
            debitBalance,
            creditBalance
        };
    }).ToList();

    var totalDebits = rows.Sum(r => r.debitBalance);
    var totalCredits = rows.Sum(r => r.creditBalance);
    var isBalanced = Math.Abs(totalDebits - totalCredits) < 0.01m;

    return Results.Ok(new
    {
        statementDate = DateTime.UtcNow,
        rows,
        totalDebits,
        totalCredits,
        isBalanced
    });
});

app.Run();

// DTOs
public record CreateInvoiceItemDto(string Description, decimal Quantity, decimal UnitPrice, int RevenueAccountId);
public record CreateInvoiceDto(
    string CustomerName,
    string CustomerTaxId,
    string CustomerAddress,
    DateTime? IssueDate,
    DateTime? DueDate,
    string? Notes,
    List<CreateInvoiceItemDto> Items
);
public record ReverseDto(string Reason);


