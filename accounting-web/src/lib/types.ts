export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type ActorRole = 'Accountant' | 'Auditor';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: number | AccountType;
  description: string;
  currentBalance: number;
}

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  revenueAccountId: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerTaxId: string;
  customerAddress: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  vatRate: number;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  notes?: string;
  postedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
  journalEntryId?: number;
  reversalJournalEntryId?: number;
}

export interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineMemo?: string;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceDocument: string;
  isReversed: boolean;
  createdAt: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface LedgerEntry {
  id: number;
  entryDate: string;
  journalEntryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  reference: string;
  description: string;
  isCounterEntry: boolean;
  createdAt: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceReport {
  statementDate: string;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}
