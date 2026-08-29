import { Account, Invoice, JournalEntry, LedgerEntry, TrialBalanceReport } from './types';
import Decimal from 'decimal.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch(`${API_BASE}/api/accounts`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/api/invoices`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchInvoiceById(id: number): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/api/invoices/${id}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function createInvoice(payload: {
  customerName: string;
  customerTaxId: string;
  customerAddress: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number; revenueAccountId: number }[];
}): Promise<Invoice> {
  const res = await fetch(`${API_BASE}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invoice creation failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function postInvoice(id: number): Promise<{ invoice: Invoice; journalEntry: JournalEntry; pdfBase64: string }> {
  const res = await fetch(`${API_BASE}/api/invoices/${id}/post`, {
    method: 'POST'
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Posting invoice failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function reverseInvoice(id: number, reason: string): Promise<{ invoice: Invoice; reversalJournalEntry: JournalEntry }> {
  const res = await fetch(`${API_BASE}/api/invoices/${id}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Reversal failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export function getInvoicePdfUrl(id: number): string {
  return `${API_BASE}/api/invoices/${id}/pdf`;
}

export async function fetchLedger(): Promise<LedgerEntry[]> {
  const res = await fetch(`${API_BASE}/api/ledger`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const res = await fetch(`${API_BASE}/api/journal-entries`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchTrialBalance(): Promise<TrialBalanceReport> {
  const res = await fetch(`${API_BASE}/api/reports/trial-balance`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

/**
 * Precision financial calculations with Decimal.js
 */
export function calculateInvoiceTotals(items: { quantity: number; unitPrice: number }[], vatRate = 0.07): {
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
} {
  let subtotal = new Decimal(0);
  items.forEach(item => {
    const itemTotal = new Decimal(item.quantity || 0).times(new Decimal(item.unitPrice || 0));
    subtotal = subtotal.plus(itemTotal);
  });

  const vat = subtotal.times(new Decimal(vatRate)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const total = subtotal.plus(vat);

  return {
    subtotal: subtotal.toNumber(),
    vatAmount: vat.toNumber(),
    totalAmount: total.toNumber()
  };
}
