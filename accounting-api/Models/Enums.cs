namespace accounting_api.Models;

public enum AccountType
{
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense
}

public enum InvoiceStatus
{
    DRAFT,
    POSTED,
    REVERSED
}

public enum ActorRole
{
    Accountant,
    Auditor
}
