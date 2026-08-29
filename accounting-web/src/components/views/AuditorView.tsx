'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LedgerEntry, TrialBalanceReport, Account, JournalEntry } from '@/lib/types';
import { fetchLedger, fetchTrialBalance, fetchAccounts, fetchJournalEntries } from '@/lib/api';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef
} from '@tanstack/react-table';
import { ShieldCheck, BookOpen, Scale, ListTree, CheckCircle2, AlertCircle, RefreshCw, Search, ArrowUpDown, FileSpreadsheet } from 'lucide-react';

export default function AuditorView() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'TRIAL_BALANCE' | 'CHART_OF_ACCOUNTS' | 'JOURNAL'>('LEDGER');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [ledger, tb, acc, je] = await Promise.all([
        fetchLedger(),
        fetchTrialBalance(),
        fetchAccounts(),
        fetchJournalEntries()
      ]);
      setLedgerEntries(ledger);
      setTrialBalance(tb);
      setAccounts(acc);
      setJournalEntries(je);
    } finally {
      setIsLoading(false);
    }
  }

  // TanStack Table columns for General Ledger
  const ledgerColumns = useMemo<ColumnDef<LedgerEntry>[]>(() => [
    {
      accessorKey: 'entryDate',
      header: 'Entry Date',
      cell: info => <span className="font-mono text-sm">{new Date(info.getValue<string>()).toLocaleDateString()}</span>,
    },
    {
      accessorKey: 'accountCode',
      header: 'Account Code',
      cell: info => <span className="font-mono font-bold text-cyan-400" style={{ color: 'var(--accent-cyan)' }}>{info.getValue<string>()}</span>,
    },
    {
      accessorKey: 'accountName',
      header: 'Account Name',
      cell: info => <span style={{ fontWeight: 600 }}>{info.getValue<string>()}</span>,
    },
    {
      accessorKey: 'debit',
      header: 'Debit (Dr)',
      cell: info => {
        const val = info.getValue<number>();
        return val > 0 ? (
          <span className="font-mono" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
            {val.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        );
      },
    },
    {
      accessorKey: 'credit',
      header: 'Credit (Cr)',
      cell: info => {
        const val = info.getValue<number>();
        return val > 0 ? (
          <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
            {val.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        );
      },
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: info => <span className="font-mono" style={{ fontSize: '0.85rem' }}>{info.getValue<string>()}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: info => <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{info.getValue<string>()}</span>,
    },
    {
      accessorKey: 'isCounterEntry',
      header: 'Audit Tag',
      cell: info => {
        const isCounter = info.getValue<boolean>();
        return isCounter ? (
          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            🔄 REVERSAL COUNTER
          </span>
        ) : (
          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            POSTED
          </span>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: ledgerEntries,
    columns: ledgerColumns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Auditor Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck style={{ color: 'var(--accent-purple)', width: 28, height: 28 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Auditor & General Ledger Inspection</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Immutable audit trail • Trial Balance verification • TanStack table analytics • Partitioned ledger
          </p>
        </div>

        <button onClick={loadData} disabled={isLoading} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw style={{ width: 14, height: 14, animation: isLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh Audit Data
        </button>
      </div>

      {/* Auditor Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'LEDGER', label: `General Ledger (${ledgerEntries.length})`, icon: BookOpen, color: 'var(--accent-cyan)' },
          { id: 'TRIAL_BALANCE', label: 'Trial Balance Statement', icon: Scale, color: 'var(--accent-emerald)' },
          { id: 'CHART_OF_ACCOUNTS', label: `Chart of Accounts (${accounts.length})`, icon: ListTree, color: 'var(--accent-purple)' },
          { id: 'JOURNAL', label: `Journal Entries (${journalEntries.length})`, icon: FileSpreadsheet, color: 'var(--accent-amber)' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: isActive ? `1px solid ${tab.color}` : '1px solid var(--border-glass)',
                background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon style={{ width: 16, height: 16, color: tab.color }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Ledger with TanStack Table */}
      {activeTab === 'LEDGER' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Partitioned General Ledger</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                🛡️ Guaranteed Invariant: LedgerImmutabilityNoHardDelete
              </span>
            </div>

            {/* Search Filter */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search ledger entries..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-glass-bright)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ padding: '12px 14px' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div>
              Showing {table.getRowModel().rows.length} of {ledgerEntries.length} entries
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Trial Balance Statement */}
      {activeTab === 'TRIAL_BALANCE' && trialBalance && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Trial Balance Statement (งบทดลอง)</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                As of {new Date(trialBalance.statementDate).toLocaleString()}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '20px',
              background: trialBalance.isBalanced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${trialBalance.isBalanced ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
              color: trialBalance.isBalanced ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              {trialBalance.isBalanced ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <AlertCircle style={{ width: 18, height: 18 }} />}
              <span>{trialBalance.isBalanced ? '✅ EQUALITY INVARIANT VERIFIED: Sum(Dr) == Sum(Cr)' : '⚠️ OUT OF BALANCE'}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-glass-bright)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Code</th>
                  <th style={{ padding: '12px 16px' }}>Account Title</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Debit (THB)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Credit (THB)</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">{row.accountCode}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.accountName}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.accountType}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} className="font-mono">
                      {row.debitBalance > 0 ? (
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          {row.debitBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} className="font-mono">
                      {row.creditBalance > 0 ? (
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          {row.creditBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-glass-bright)', background: 'rgba(0,0,0,0.3)', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '14px 16px', fontSize: '1rem' }}>TOTAL EQUALITY CHECK:</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-emerald)', fontSize: '1.05rem' }} className="font-mono">
                    {trialBalance.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--accent-cyan)', fontSize: '1.05rem' }} className="font-mono">
                    {trialBalance.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Chart of Accounts */}
      {activeTab === 'CHART_OF_ACCOUNTS' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>
            Enterprise Chart of Accounts (ผังบัญชี)
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>
                    {acc.code}
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                    {typeof acc.type === 'number' ? ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'][acc.type] : acc.type}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{acc.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{acc.description}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Balance:</span>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Journal Entries */}
      {activeTab === 'JOURNAL' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>
            General Journal Entries (สมุดรายวันทั่วไป)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {journalEntries.map(je => (
              <div key={je.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                  <div>
                    <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>
                      {je.entryNumber}
                    </span>
                    <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Date: {new Date(je.entryDate).toLocaleDateString()} • Ref: {je.referenceDocument}
                    </span>
                  </div>

                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: je.isReversed ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: je.isReversed ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                  }}>
                    {je.isReversed ? 'REVERSED' : 'ACTIVE / BALANCED'}
                  </span>
                </div>

                <div style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                  {je.description}
                </div>

                {/* Lines */}
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-glass)' }}>
                      <th style={{ padding: '6px 10px' }}>Account</th>
                      <th style={{ padding: '6px 10px' }}>Memo</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Debit (Dr)</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {je.lines.map((l, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{l.accountCode}</span> - {l.accountName}
                        </td>
                        <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{l.lineMemo || '-'}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }} className="font-mono">
                          {l.debit > 0 ? `${l.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿` : '-'}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }} className="font-mono">
                          {l.credit > 0 ? `${l.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
