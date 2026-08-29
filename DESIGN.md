system: 02_ACCOUNTING_ENGINE
tech_stack:
  frontend: "Next.js 16 (PPR) + @tanstack/react-table + @react-pdf-viewer/core + decimal.js"
  backend: ".NET 10 + MediatR 12 + QuestPDF 2026.x + System.Decimal"
  orm: "EF Core 10 (Npgsql.EntityFrameworkCore.PostgreSQL)"
  storage: "PostgreSQL 18 (Partitioned Ledger) + MinIO/S3"
  protocols: "HTTPS, PDF/A Byte Streaming"
spec:
  actors: [Accountant, Auditor]
  invariants: [StrictDebitCreditEquality, LedgerImmutabilityNoHardDelete]
  state_transitions:
    - { from: DRAFT, to: POSTED, trigger: POST_INVOICE, handler: "Invoices.PostInvoice", validation: "Sum(Dr) == Sum(Cr)", side_effects: ["QuestPdf.RenderTaxInvoice", "Ledger.AppendEntry"] }
    - { from: POSTED, to: REVERSED, trigger: REVERSE_INVOICE, handler: "Invoices.Reverse", side_effects: ["Ledger.CreateCounterEntry"] }