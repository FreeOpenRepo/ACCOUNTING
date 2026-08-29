using accounting_api.Data;
using accounting_api.Features.Invoices;
using accounting_api.Models;
using accounting_api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace accounting_api.Tests;

public class DomainInvariantTests
{
    private AccountingDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AccountingDbContext>()
            .UseInMemoryDatabase(databaseName: $"AccountingTestDb_{Guid.NewGuid()}")
            .Options;

        var db = new AccountingDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task Invariant_StrictDebitCreditEquality_EnforcesBalanceOnPosting()
    {
        using var db = CreateInMemoryDbContext();
        var pdfService = new TaxInvoicePdfService();
        var handler = new PostInvoiceCommandHandler(db, pdfService, NullLogger<PostInvoiceCommandHandler>.Instance);

        // Fetch seeded invoice 1 (Total: 135,000 + 7% VAT 9,450 = 144,450 THB)
        var result = await handler.Handle(new PostInvoiceCommand(1), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(InvoiceStatus.POSTED, result.Invoice.Status);
        Assert.NotNull(result.JournalEntry);
        
        // Invariant: StrictDebitCreditEquality
        Assert.True(result.JournalEntry.IsBalanced);
        Assert.Equal(result.JournalEntry.TotalDebit, result.JournalEntry.TotalCredit);
        Assert.Equal(144450.00m, result.JournalEntry.TotalDebit);
        Assert.NotEmpty(result.PdfBytes);
    }

    [Fact]
    public async Task Invariant_LedgerImmutabilityNoHardDelete_CreatesCounterEntryOnReversal()
    {
        using var db = CreateInMemoryDbContext();
        var pdfService = new TaxInvoicePdfService();
        var postHandler = new PostInvoiceCommandHandler(db, pdfService, NullLogger<PostInvoiceCommandHandler>.Instance);
        var reverseHandler = new ReverseInvoiceCommandHandler(db, NullLogger<ReverseInvoiceCommandHandler>.Instance);

        // 1. Post Invoice
        var postResult = await postHandler.Handle(new PostInvoiceCommand(1), CancellationToken.None);
        var initialLedgerCount = await db.LedgerEntries.CountAsync();
        Assert.True(initialLedgerCount > 0);

        // 2. Reverse Invoice
        var reverseResult = await reverseHandler.Handle(new ReverseInvoiceCommand(1, "Customer billing address changed"), CancellationToken.None);

        Assert.Equal(InvoiceStatus.REVERSED, reverseResult.Invoice.Status);
        Assert.NotNull(reverseResult.ReversalJournalEntry);
        Assert.True(reverseResult.ReversalJournalEntry.IsBalanced);

        // Invariant Check: Ledger entries grew (Counter entries appended) instead of deleted
        var finalLedgerCount = await db.LedgerEntries.CountAsync();
        Assert.Equal(initialLedgerCount * 2, finalLedgerCount);

        // Original entry still exists in DB
        var originalJe = await db.JournalEntries.FindAsync(postResult.JournalEntry.Id);
        Assert.NotNull(originalJe);
        Assert.True(originalJe.IsReversed);

        // Reversal counter entries exist
        var counterEntries = await db.LedgerEntries.Where(l => l.IsCounterEntry).ToListAsync();
        Assert.NotEmpty(counterEntries);
    }

    [Fact]
    public void QuestPdf_GeneratesValidPdfBytes()
    {
        var pdfService = new TaxInvoicePdfService();
        var invoice = new Invoice
        {
            InvoiceNumber = "INV-TEST-001",
            CustomerName = "Test Corporation Co., Ltd.",
            CustomerTaxId = "0105559998881",
            CustomerAddress = "123 Test Road, Bangkok",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            Status = InvoiceStatus.POSTED,
            Items = new List<InvoiceItem>
            {
                new() { Description = "Software Engineering Services", Quantity = 10, UnitPrice = 3000m }
            }
        };

        var bytes = pdfService.GenerateTaxInvoicePdf(invoice);
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 1000, "PDF byte stream should contain full PDF structure");
        
        // Verify PDF Header magic bytes %PDF
        Assert.Equal((byte)'%', bytes[0]);
        Assert.Equal((byte)'P', bytes[1]);
        Assert.Equal((byte)'D', bytes[2]);
        Assert.Equal((byte)'F', bytes[3]);
    }
}
