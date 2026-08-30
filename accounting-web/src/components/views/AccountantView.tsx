'use client';

import React, { useState, useEffect } from 'react';
import { Invoice, Account, InvoiceItem } from '@/lib/types';
import { fetchInvoices, fetchAccounts, createInvoice, postInvoice, reverseInvoice, getInvoicePdfUrl, calculateInvoiceยอดรวมs } from '@/lib/api';
import { 
  Plus, FileText, CheckCircle2, RotateCcw, AlertTriangle, 
  ArrowRight, DollarSign, Calendar, Sparkles, X, Eye, 
  Building2, Hash, Percent, Layers 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { showSuccess, showError, showยืนยัน } from '@/lib/swal';

export default function AccountantView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [invoiceToReverse, setInvoiceToReverse] = useState<Invoice | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Invoice Form State
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ description: string; quantity: number; unitPrice: number; revenueAccountId: number }[]>([
    { description: 'Cloud Engineering & Architecture Services', quantity: 1, unitPrice: 45000, revenueAccountId: 8 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [invList, accList] = await Promise.all([
      fetchInvoices(),
      fetchAccounts()
    ]);
    setInvoices(invList);
    setAccounts(accList);
  }

  function addItemRow() {
    setItems(prev => [
      ...prev,
      { description: '', quantity: 1, unitPrice: 0, revenueAccountId: accounts.find(a => a.code === '4100')?.id || 8 }
    ]);
  }

  function removeItemRow(index: number) {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  }

  function updateItemRow(index: number, field: string, value: any) {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  const { subtotal, vatAmount, totalAmount } = calculateInvoiceยอดรวมs(items);

  async function handleCreateInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || items.length === 0) return;
    setIsSubmitting(true);
    try {
      await createInvoice({
        customerName,
        customerTaxId,
        customerAddress,
        notes,
        items
      });
      setIsCreateModalOpen(false);
      resetForm();
      await loadData();
      confetti({ particleCount: 50, spread: 60 });
      showSuccess('สร้างใบแจ้งหนี้สำเร็จ', 'สร้าง Draft Invoice และผูกรายการเรียบร้อยแล้ว');
    } catch (err: any) {
      showError('ไม่สามารถสร้างใบแจ้งหนี้ได้', err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setCustomerName('');
    setCustomerTaxId('');
    setCustomerAddress('');
    setNotes('');
    setItems([{ description: 'Cloud Engineering & Architecture Services', quantity: 1, unitPrice: 45000, revenueAccountId: 8 }]);
  }

  async function handlePostInvoice(invoice: Invoice) {
    const confirmed = await showยืนยัน(
      'ยืนยันการ Post Invoice?',
      `ใบแจ้งหนี้ #${invoice.invoiceNumber} จะถูกบันทึกบัญชีแยกประเภททั่วไป (Dr/Cr) ถาวรตาม Invariant`,
      'ยืนยัน Post'
    );
    if (!confirmed) return;

    try {
      const result = await postInvoice(invoice.id);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      await loadData();
      setSelectedInvoiceForPdf(result.invoice);
      showSuccess('Post บัญชีสำเร็จ!', `บันทึก Journal Entry ลงในบัญชีแยกประเภทสมบูรณ์แล้ว`);
    } catch (err: any) {
      showError('ไม่สามารถ Post บัญชีได้', err.message);
    }
  }

  async function handleReverseSubmit() {
    if (!invoiceToReverse || !reversalReason) return;
    setIsSubmitting(true);
    try {
      await reverseInvoice(invoiceToReverse.id, reversalReason);
      setIsReverseModalOpen(false);
      setInvoiceToReverse(null);
      setReversalReason('');
      await loadData();
      showSuccess('กลับรายการ (Reversal) สำเร็จ', 'สร้าง Reversing Journal Entry เพื่อหักล้างยอดเดิมเรียบร้อยแล้ว');
    } catch (err: any) {
      showError('ไม่สามารถกลับรายการได้', err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText style={{ color: 'var(--accent-cyan)', width: 26, height: 26 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>ระบบออกใบกำกับภาษี & ใบแจ้งหนี้ (Billing & Invoices)</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            จัดการใบกำกับภาษี • ตรวจสอบความถูกต้องบัญชีคู่ [เดบิต = เครดิต] • สร้างไฟล์เอกสาร QuestPDF
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
          style={{ padding: '12px 20px', fontSize: '0.95rem' }}
        >
          <Plus style={{ width: 18, height: 18 }} /> + ออกใบกำกับภาษีใหม่
        </button>
      </div>

      {/* Invoices List Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          ทะเบียนใบกำกับภาษีทั้งหมด ({invoices.length})
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass-bright)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>Invoice No</th>
                <th style={{ padding: '12px 14px' }}>Customer Name</th>
                <th style={{ padding: '12px 14px' }}>Issue Date</th>
                <th style={{ padding: '12px 14px' }}>Subtotal</th>
                <th style={{ padding: '12px 14px' }}>VAT 7%</th>
                <th style={{ padding: '12px 14px' }}>ยอดรวม Due</th>
                <th style={{ padding: '12px 14px' }}>สถานะ</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const isDraft = inv.status === 'DRAFT';
                const isPosted = inv.status === 'POSTED';
                const isReversed = inv.status === 'REVERSED';

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                      {inv.invoiceNumber}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax ID: {inv.customerTaxId || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px' }} className="font-mono">
                      {inv.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td style={{ padding: '14px', color: 'var(--text-secondary)' }} className="font-mono">
                      {inv.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td style={{ padding: '14px', fontWeight: 800, color: isReversed ? 'var(--accent-rose)' : 'var(--accent-emerald)' }} className="font-mono">
                      {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className={`badge-${inv.status.toLowerCase()}`} style={{ padding: '4px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {isDraft && (
                          <button
                            onClick={() => handlePostInvoice(inv)}
                            className="btn-success"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            title="State Transition: DRAFT -> POSTED (Appends to General Ledger & Validates Sum(Dr)==Sum(Cr))"
                          >
                            <CheckCircle2 style={{ width: 14, height: 14 }} /> Post Invoice
                          </button>
                        )}

                        {isPosted && (
                          <>
                            <button
                              onClick={() => setSelectedInvoiceForPdf(inv)}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              <Eye style={{ width: 14, height: 14 }} /> View PDF
                            </button>

                            <button
                              onClick={() => {
                                setInvoiceToReverse(inv);
                                setIsReverseModalOpen(true);
                              }}
                              className="btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              title="State Transition: POSTED -> REVERSED (Preserves Ledger Immutability via Counter-Entry)"
                            >
                              <RotateCcw style={{ width: 14, height: 14 }} /> Reverse
                            </button>
                          </>
                        )}

                        {isReversed && (
                          <button
                            onClick={() => setSelectedInvoiceForPdf(inv)}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            <Eye style={{ width: 14, height: 14 }} /> View PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* สร้างใหม่ Tax Invoice Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>New Customer Tax Invoice (ใบกำกับภาษี)</h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X style={{ width: 22, height: 22 }} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                {/* Customer Information */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Name / บริษัทลูกค้า *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siam Cyber Solutions Co., Ltd."
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tax ID / เลขประจำตัวผู้เสียภาษี (13 Digits)</label>
                    <input
                      type="text"
                      placeholder="e.g. 0105558123456"
                      value={customerTaxId}
                      onChange={e => setCustomerTaxId(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Billing Address / ที่อยู่ใบกำกับภาษี</label>
                    <input
                      type="text"
                      placeholder="e.g. 99/1 Rama 9 Rd, Huai Khwang, Bangkok 10310"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Line Items (รายการสินค้าและบริการ)</label>
                    <button type="button" onClick={addItemRow} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                      <Plus style={{ width: 14, height: 14 }} /> Add Line Item
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        required
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateItemRow(idx, 'description', e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => updateItemRow(idx, 'quantity', Number(e.target.value))}
                        style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={e => updateItemRow(idx, 'unitPrice', Number(e.target.value))}
                        style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                      />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '6px' }}>
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Real-time Invariant & Balance Indicator */}
                <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calculator style={{ width: 16, height: 16 }} /> Double-Entry Invariant Preview
                    </span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Sum(Debit) == Sum(Credit)
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontFamily: 'var(--font-mono)' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Debit: Accounts Receivable (1200)</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>+{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)' }}>Credit: Revenue (4100) + VAT 7% (2200)</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>+{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿ + {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Grand ยอดรวม Due</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }} className="font-mono">
                    {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} THB
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary">
                    {isSubmitting ? 'Saving...' : 'Save Draft Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Invoice Modal */}
      {isReverseModalOpen && invoiceToReverse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--accent-rose)' }}>
              <AlertTriangle style={{ width: 24, height: 24 }} />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Reverse Tax Invoice</h2>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Reversing invoice <strong>{invoiceToReverse.invoiceNumber}</strong> will create an immutable Counter-Entry in the General Ledger (swapping debits and credits) pursuant to invariant <strong>LedgerImmutabilityNoHardลบ</strong>.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reason for Reversal / สาเหตุการยกเลิก *</label>
              <input
                type="text"
                required
                placeholder="e.g. Incorrect tax invoice details requested by customer"
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsReverseModalOpen(false)} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleReverseSubmit} disabled={isSubmitting || !reversalReason} className="btn-danger">
                {isSubmitting ? 'Reversing...' : 'ยืนยัน Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selectedInvoiceForPdf && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '900px', width: '100%', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Tax Invoice PDF • {selectedInvoiceForPdf.invoiceNumber}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QuestPDF 2025 PDF/A Engine</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={getInvoicePdfUrl(selectedInvoiceForPdf.id)}
                  download={`TaxInvoice-${selectedInvoiceForPdf.invoiceNumber}.pdf`}
                  className="btn-primary"
                  style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  <Download style={{ width: 16, height: 16 }} /> ดาวน์โหลด PDF
                </a>
                <button onClick={() => setSelectedInvoiceForPdf(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X style={{ width: 22, height: 22 }} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#1e293b' }}>
              <iframe
                src={getInvoicePdfUrl(selectedInvoiceForPdf.id)}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Tax Invoice PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

