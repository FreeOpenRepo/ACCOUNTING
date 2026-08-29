'use client';

import React, { useState, useEffect } from 'react';
import { ActorRole } from '@/lib/types';
import AccountantView from '@/components/views/AccountantView';
import AuditorView from '@/components/views/AuditorView';
import { Landmark, FileText, ShieldCheck, Wifi, WifiOff, Sparkles } from 'lucide-react';

export default function Home() {
  const [activeRole, setActiveRole] = useState<ActorRole>('Accountant');
  const [isApiOnline, setIsApiOnline] = useState<boolean>(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    try {
      const res = await fetch('http://localhost:5010/api/health');
      setIsApiOnline(res.ok);
    } catch {
      setIsApiOnline(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          background: 'rgba(6, 9, 17, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-glass)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          padding: '12px 24px'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)'
            }}>
              <Landmark style={{ color: '#fff', width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ENTERPRISE <span style={{ color: 'var(--accent-cyan)' }}>ACCOUNTING</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                02_ACCOUNTING_ENGINE
              </div>
            </div>
          </div>

          {/* Actor Role Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            padding: '4px',
            borderRadius: '14px',
            gap: '4px'
          }}>
            {[
              { role: 'Accountant' as const, label: 'Accountant (Invoices & Billing)', icon: FileText, color: 'var(--accent-cyan)' },
              { role: 'Auditor' as const, label: 'Auditor (Ledger & Trial Balance)', icon: ShieldCheck, color: 'var(--accent-purple)' },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeRole === tab.role;
              return (
                <button
                  key={tab.role}
                  onClick={() => setActiveRole(tab.role)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: isActive ? tab.color : 'inherit' }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* API Health */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: isApiOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${isApiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: isApiOnline ? '#34d399' : '#fca5a5'
          }}>
            {isApiOnline ? <Wifi style={{ width: 12, height: 12 }} /> : <WifiOff style={{ width: 12, height: 12 }} />}
            <span>{isApiOnline ? 'Accounting API Active' : 'Connecting API :5010...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '16px' }}>
        {activeRole === 'Accountant' && <AccountantView />}
        {activeRole === 'Auditor' && <AuditorView />}
      </div>
    </main>
  );
}
