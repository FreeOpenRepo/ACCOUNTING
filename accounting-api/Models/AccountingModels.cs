namespace accounting_api.Models;

public class Account
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty; // e.g. 1100, 1200, 2100, 2200, 4100
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; } = 0m;
}

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; } = 1m;
    public decimal UnitPrice { get; set; } = 0m;
    public decimal Amount => Math.Round(Quantity * UnitPrice, 2);
    public int RevenueAccountId { get; set; } // Default: 4100
}

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerTaxId { get; set; } = string.Empty;
    public string CustomerAddress { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
    
    public InvoiceStatus Status { get; set; } = InvoiceStatus.DRAFT;
    public decimal VatRate { get; set; } = 0.07m; // 7% Thai VAT
    
    public List<InvoiceItem> Items { get; set; } = new();

    public decimal Subtotal => Items.Sum(i => i.Amount);
    public decimal VatAmount => Math.Round(Subtotal * VatRate, 2);
    public decimal TotalAmount => Subtotal + VatAmount;

    public string? Notes { get; set; }
    public DateTime? PostedAt { get; set; }
    public DateTime? ReversedAt { get; set; }
    public string? ReversalReason { get; set; }
    
    public int? JournalEntryId { get; set; }
    public int? ReversalJournalEntryId { get; set; }
    public string? PdfFileKey { get; set; }
}

public class JournalEntryLine
{
    public int Id { get; set; }
    public int JournalEntryId { get; set; }
    public int AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    
    // Invariant: StrictDebitCreditEquality
    public decimal Debit { get; set; } = 0m;
    public decimal Credit { get; set; } = 0m;
    public string? LineMemo { get; set; }
}

public class JournalEntry
{
    public int Id { get; set; }
    public string EntryNumber { get; set; } = string.Empty;
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public string ReferenceDocument { get; set; } = string.Empty; // e.g. INV-2026-001
    public bool IsReversed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<JournalEntryLine> Lines { get; set; } = new();

    public decimal TotalDebit => Lines.Sum(l => l.Debit);
    public decimal TotalCredit => Lines.Sum(l => l.Credit);

    // Invariant Check
    public bool IsBalanced => Math.Abs(TotalDebit - TotalCredit) < 0.0001m && TotalDebit > 0m;
}

public class LedgerEntry
{
    public int Id { get; set; }
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public int JournalEntryId { get; set; }
    public int AccountId { get; set; }
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsCounterEntry { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
