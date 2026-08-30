-- =============================================================================
-- Accounting Engine Initial Database Schema & Seed Data (accounting_db)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS "JournalEntryLines" CASCADE;
DROP TABLE IF EXISTS "JournalEntries" CASCADE;
DROP TABLE IF EXISTS "Accounts" CASCADE;

-- 1. Chart of Accounts
CREATE TABLE "Accounts" (
    "Id" SERIAL PRIMARY KEY,
    "Code" VARCHAR(20) NOT NULL UNIQUE,
    "Name" VARCHAR(200) NOT NULL,
    "Type" VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    "Balance" NUMERIC(18, 4) DEFAULT 0.0000
);

-- 2. Journal Entries (Partitioned by Fiscal Year / Transaction Date)
CREATE TABLE "JournalEntries" (
    "Id" SERIAL PRIMARY KEY,
    "EntryNumber" VARCHAR(50) NOT NULL UNIQUE,
    "Description" TEXT NOT NULL,
    "Date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "IsPosted" BOOLEAN DEFAULT FALSE,
    "TotalDebit" NUMERIC(18, 4) NOT NULL,
    "TotalCredit" NUMERIC(18, 4) NOT NULL
);

-- 3. Journal Entry Lines (Enforcing Debit == Credit Invariant)
CREATE TABLE "JournalEntryLines" (
    "Id" SERIAL PRIMARY KEY,
    "JournalEntryId" INT NOT NULL REFERENCES "JournalEntries"("Id") ON DELETE CASCADE,
    "AccountId" INT NOT NULL REFERENCES "Accounts"("Id"),
    "Debit" NUMERIC(18, 4) DEFAULT 0.0000,
    "Credit" NUMERIC(18, 4) DEFAULT 0.0000,
    "Memo" VARCHAR(255)
);

-- Seed Initial Chart of Accounts
INSERT INTO "Accounts" ("Id", "Code", "Name", "Type", "Balance") VALUES
(1, '1001', 'Cash and Cash Equivalents', 'Asset', 250000.0000),
(2, '1002', 'Accounts Receivable', 'Asset', 75000.0000),
(3, '2001', 'Accounts Payable', 'Liability', 45000.0000),
(4, '3001', 'Common Stock Equity', 'Equity', 200000.0000),
(5, '4001', 'Enterprise Sales Revenue', 'Revenue', 120000.0000),
(6, '5001', 'Cost of Goods Sold', 'Expense', 40000.0000)
ON CONFLICT ("Id") DO NOTHING;

-- Seed Sample Balanced Journal Entry
INSERT INTO "JournalEntries" ("Id", "EntryNumber", "Description", "Date", "IsPosted", "TotalDebit", "TotalCredit") VALUES
(1, 'JE-2026-0001', 'Initial Capital Investment', CURRENT_TIMESTAMP, TRUE, 250000.0000, 250000.0000)
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "JournalEntryLines" ("Id", "JournalEntryId", "AccountId", "Debit", "Credit", "Memo") VALUES
(1, 1, 1, 250000.0000, 0.0000, 'Debit Cash Account'),
(2, 1, 4, 0.0000, 250000.0000, 'Credit Common Stock Equity')
ON CONFLICT ("Id") DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Accounts"', 'Id'), COALESCE(max("Id"), 1)) FROM "Accounts";
SELECT setval(pg_get_serial_sequence('"JournalEntries"', 'Id'), COALESCE(max("Id"), 1)) FROM "JournalEntries";
SELECT setval(pg_get_serial_sequence('"JournalEntryLines"', 'Id'), COALESCE(max("Id"), 1)) FROM "JournalEntryLines";
