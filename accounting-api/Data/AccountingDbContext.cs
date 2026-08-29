using Microsoft.EntityFrameworkCore;
using accounting_api.Models;

namespace accounting_api.Data;

public class AccountingDbContext : DbContext
{
    public AccountingDbContext(DbContextOptions<AccountingDbContext> options) : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed Chart of Accounts
        modelBuilder.Entity<Account>().HasData(
            new Account { Id = 1, Code = "1100", Name = "Cash & Bank Accounts", Type = AccountType.Asset, Description = "Primary Operating Bank Account", CurrentBalance = 250000.00m },
            new Account { Id = 2, Code = "1200", Name = "Accounts Receivable", Type = AccountType.Asset, Description = "Customer Invoiced Receivables", CurrentBalance = 85000.00m },
            new Account { Id = 3, Code = "1300", Name = "Merchandise Inventory", Type = AccountType.Asset, Description = "Inventory and supplies", CurrentBalance = 120000.00m },
            new Account { Id = 4, Code = "2100", Name = "Accounts Payable", Type = AccountType.Liability, Description = "Vendor payables", CurrentBalance = 45000.00m },
            new Account { Id = 5, Code = "2200", Name = "Output VAT 7% (ภาษีขาย)", Type = AccountType.Liability, Description = "Collected sales tax payable to revenue department", CurrentBalance = 14500.00m },
            new Account { Id = 6, Code = "3100", Name = "Registered Capital", Type = AccountType.Equity, Description = "Common shares and paid-in capital", CurrentBalance = 350000.00m },
            new Account { Id = 7, Code = "3200", Name = "Retained Earnings", Type = AccountType.Equity, Description = "Accumulated business profits", CurrentBalance = 45500.00m },
            new Account { Id = 8, Code = "4100", Name = "Software & SaaS Revenue", Type = AccountType.Revenue, Description = "Software licenses and subscription income", CurrentBalance = 180000.00m },
            new Account { Id = 9, Code = "4200", Name = "Consulting & Services Revenue", Type = AccountType.Revenue, Description = "Professional engineering and advisory services", CurrentBalance = 75000.00m },
            new Account { Id = 10, Code = "5100", Name = "Cloud Infrastructure & Server Cost", Type = AccountType.Expense, Description = "AWS / GCP / Cloud computing costs", CurrentBalance = 32000.00m },
            new Account { Id = 11, Code = "5200", Name = "Salaries & General Administrative", Type = AccountType.Expense, Description = "Staff payroll and office overhead", CurrentBalance = 73000.00m }
        );

        // Seed Sample Invoice
        modelBuilder.Entity<Invoice>().HasData(
            new Invoice
            {
                Id = 1,
                InvoiceNumber = "INV-2026-0001",
                CustomerName = "Apex Technology Solutions Co., Ltd.",
                CustomerTaxId = "0105558123456",
                CustomerAddress = "88 Sathorn Square Tower 24th Fl., Bangkok 10500",
                IssueDate = DateTime.UtcNow.AddDays(-5),
                DueDate = DateTime.UtcNow.AddDays(25),
                Status = InvoiceStatus.DRAFT,
                VatRate = 0.07m,
                Notes = "Enterprise Cloud Integration & SLA Support Q1"
            }
        );

        modelBuilder.Entity<InvoiceItem>().HasData(
            new InvoiceItem
            {
                Id = 1,
                InvoiceId = 1,
                Description = "High-Performance Cloud Architecture Consulting (40 hrs)",
                Quantity = 40,
                UnitPrice = 2500.00m,
                RevenueAccountId = 9
            },
            new InvoiceItem
            {
                Id = 2,
                InvoiceId = 1,
                Description = "Enterprise Security Audit & Compliance Assessment",
                Quantity = 1,
                UnitPrice = 35000.00m,
                RevenueAccountId = 9
            }
        );
    }
}
