using accounting_api.Data;
using accounting_api.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace accounting_api.Features.Invoices;

public record ReverseInvoiceCommand(int InvoiceId, string Reason) : IRequest<ReverseInvoiceResult>;

public record ReverseInvoiceResult(
    Invoice Invoice,
    JournalEntry ReversalJournalEntry
);

public class ReverseInvoiceCommandHandler : IRequestHandler<ReverseInvoiceCommand, ReverseInvoiceResult>
{
    private readonly AccountingDbContext _db;
    private readonly ILogger<ReverseInvoiceCommandHandler> _logger;

    public ReverseInvoiceCommandHandler(
        AccountingDbContext db,
        ILogger<ReverseInvoiceCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ReverseInvoiceResult> Handle(ReverseInvoiceCommand request, CancellationToken cancellationToken)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == request.InvoiceId, cancellationToken)
            ?? throw new KeyNotFoundException($"Invoice ID {request.InvoiceId} not found.");

        if (invoice.Status != InvoiceStatus.POSTED)
        {
            throw new InvalidOperationException($"Cannot reverse invoice with status '{invoice.Status}'. Only 'POSTED' invoices can be reversed.");
        }

        if (invoice.JournalEntryId == null)
        {
            throw new InvalidOperationException("Original Journal Entry reference is missing from posted invoice.");
        }

        var originalJe = await _db.JournalEntries
            .Include(j => j.Lines)
            .FirstOrDefaultAsync(j => j.Id == invoice.JournalEntryId.Value, cancellationToken)
            ?? throw new InvalidOperationException($"Original Journal Entry {invoice.JournalEntryId.Value} not found.");

        // Invariant: LedgerImmutabilityNoHardDelete
        // We DO NOT delete or alter the original journal entry or ledger records.
        // We append a new Counter-Entry (Swapped Debits and Credits) to cancel out balances.

        var reversalJe = new JournalEntry
        {
            EntryNumber = $"REV-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}",
            EntryDate = DateTime.UtcNow,
            Description = $"Reversal of Invoice {invoice.InvoiceNumber} - Reason: {request.Reason}",
            ReferenceDocument = $"REV:{invoice.InvoiceNumber}",
            CreatedAt = DateTime.UtcNow
        };

        foreach (var line in originalJe.Lines)
        {
            // Swap Debit & Credit
            reversalJe.Lines.Add(new JournalEntryLine
            {
                AccountId = line.AccountId,
                AccountCode = line.AccountCode,
                AccountName = line.AccountName,
                Debit = line.Credit,  // Swap
                Credit = line.Debit,  // Swap
                LineMemo = $"Counter-entry reversing line #{line.Id} ({line.AccountName})"
            });
        }

        if (!reversalJe.IsBalanced)
        {
            throw new InvalidOperationException("Reversal Journal Entry failed balance validation.");
        }

        _db.JournalEntries.Add(reversalJe);
        await _db.SaveChangesAsync(cancellationToken);

        // Side-Effect: Ledger.CreateCounterEntry
        foreach (var line in reversalJe.Lines)
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
                EntryDate = reversalJe.EntryDate,
                JournalEntryId = reversalJe.Id,
                AccountId = line.AccountId,
                AccountCode = line.AccountCode,
                AccountName = line.AccountName,
                Debit = line.Debit,
                Credit = line.Credit,
                Reference = $"REV:{invoice.InvoiceNumber}",
                Description = line.LineMemo ?? reversalJe.Description,
                IsCounterEntry = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        originalJe.IsReversed = true;

        // Transition: POSTED -> REVERSED
        invoice.Status = InvoiceStatus.REVERSED;
        invoice.ReversedAt = DateTime.UtcNow;
        invoice.ReversalReason = request.Reason;
        invoice.ReversalJournalEntryId = reversalJe.Id;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Invoice {InvoiceNo} REVERSED with counter-entry {RevJE}. Ledger immutability preserved.",
            invoice.InvoiceNumber, reversalJe.EntryNumber);

        return new ReverseInvoiceResult(invoice, reversalJe);
    }
}
