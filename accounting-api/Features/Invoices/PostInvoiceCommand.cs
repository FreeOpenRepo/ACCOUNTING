using accounting_api.Data;
using accounting_api.Models;
using accounting_api.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace accounting_api.Features.Invoices;

public record PostInvoiceCommand(int InvoiceId) : IRequest<PostInvoiceResult>;

public record PostInvoiceResult(
    Invoice Invoice,
    JournalEntry JournalEntry,
    byte[] PdfBytes
);

public class PostInvoiceCommandHandler : IRequestHandler<PostInvoiceCommand, PostInvoiceResult>
{
    private readonly AccountingDbContext _db;
    private readonly ITaxInvoicePdfService _pdfService;
    private readonly ILogger<PostInvoiceCommandHandler> _logger;

    public PostInvoiceCommandHandler(
        AccountingDbContext db,
        ITaxInvoicePdfService pdfService,
        ILogger<PostInvoiceCommandHandler> logger)
    {
        _db = db;
        _pdfService = pdfService;
        _logger = logger;
    }

    public async Task<PostInvoiceResult> Handle(PostInvoiceCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId, cancellationToken)
            ?? throw new KeyNotFoundException($"Invoice ID {request.InvoiceId} not found.");

        if (invoice.Status != InvoiceStatus.DRAFT)
        {
            throw new InvalidOperationException($"Cannot post invoice with status '{invoice.Status}'. Only 'DRAFT' invoices can be posted.");
        }

        if (invoice.Items.Count == 0)
        {
            throw new InvalidOperationException("Invoice must have at least one line item before posting.");
        }

        // 1. Fetch Accounts
        var arAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == "1200", cancellationToken)
            ?? throw new InvalidOperationException("Accounts Receivable account (1200) not found.");

        var vatAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == "2200", cancellationToken)
            ?? throw new InvalidOperationException("Output VAT account (2200) not found.");

        var revenueAccount = await _db.Accounts.FirstOrDefaultAsync(a => a.Code == "4100", cancellationToken)
            ?? throw new InvalidOperationException("Default Revenue account (4100) not found.");

        // 2. Build Double-Entry Journal
        var journalEntry = new JournalEntry
        {
            EntryNumber = $"JE-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}",
            EntryDate = invoice.IssueDate,
            Description = $"Posting Tax Invoice {invoice.InvoiceNumber} - {invoice.CustomerName}",
            ReferenceDocument = invoice.InvoiceNumber,
            CreatedAt = DateTime.UtcNow
        };

        // Line 1: Debit Accounts Receivable (1200) for Total Amount (Subtotal + VAT)
        journalEntry.Lines.Add(new JournalEntryLine
        {
            AccountId = arAccount.Id,
            AccountCode = arAccount.Code,
            AccountName = arAccount.Name,
            Debit = invoice.TotalAmount,
            Credit = 0m,
            LineMemo = $"AR receivable for invoice {invoice.InvoiceNumber}"
        });

        // Line 2: Credit Revenue (4100 / item accounts) for Subtotal
        journalEntry.Lines.Add(new JournalEntryLine
        {
            AccountId = revenueAccount.Id,
            AccountCode = revenueAccount.Code,
            AccountName = revenueAccount.Name,
            Debit = 0m,
            Credit = invoice.Subtotal,
            LineMemo = $"Sales revenue for invoice {invoice.InvoiceNumber}"
        });

        // Line 3: Credit Output VAT 7% (2200) for Vat Amount
        if (invoice.VatAmount > 0)
        {
            journalEntry.Lines.Add(new JournalEntryLine
            {
                AccountId = vatAccount.Id,
                AccountCode = vatAccount.Code,
                AccountName = vatAccount.Name,
                Debit = 0m,
                Credit = invoice.VatAmount,
                LineMemo = $"Output VAT (7%) for invoice {invoice.InvoiceNumber}"
            });
        }

        // Invariant Validation: StrictDebitCreditEquality [Sum(Dr) == Sum(Cr)]
        if (!journalEntry.IsBalanced)
        {
            throw new InvalidOperationException(
                $"Invariant violation [StrictDebitCreditEquality]: Total Debits ({journalEntry.TotalDebit:N2}) do not equal Total Credits ({journalEntry.TotalCredit:N2})."
            );
        }

        _db.JournalEntries.Add(journalEntry);
        await _db.SaveChangesAsync(cancellationToken);

        // Side-Effect: Ledger.AppendEntry (Immutable ledger records)
        foreach (var line in journalEntry.Lines)
        {
            var account = await _db.Accounts.FindAsync(new object[] { line.AccountId }, cancellationToken);
            if (account != null)
            {
                if (account.Type == AccountType.Asset || account.Type == AccountType.Expense)
                {
                    account.CurrentBalance += (line.Debit - line.Credit);
                }
                else
                {
                    account.CurrentBalance += (line.Credit - line.Debit);
                }
            }

            _db.LedgerEntries.Add(new LedgerEntry
            {
                EntryDate = journalEntry.EntryDate,
                JournalEntryId = journalEntry.Id,
                AccountId = line.AccountId,
                AccountCode = line.AccountCode,
                AccountName = line.AccountName,
                Debit = line.Debit,
                Credit = line.Credit,
                Reference = invoice.InvoiceNumber,
                Description = line.LineMemo ?? journalEntry.Description,
                IsCounterEntry = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Update Invoice status: DRAFT -> POSTED
        invoice.Status = InvoiceStatus.POSTED;
        invoice.PostedAt = DateTime.UtcNow;
        invoice.JournalEntryId = journalEntry.Id;

        await _db.SaveChangesAsync(cancellationToken);

        // Side-Effect: QuestPdf.RenderTaxInvoice
        var pdfBytes = _pdfService.GenerateTaxInvoicePdf(invoice);

        _logger.LogInformation("Invoice {InvoiceNo} successfully POSTED with balanced Journal Entry {JE}. Total: {Total:N2} THB",
            invoice.InvoiceNumber, journalEntry.EntryNumber, invoice.TotalAmount);

        return new PostInvoiceResult(invoice, journalEntry, pdfBytes);
    }
}
