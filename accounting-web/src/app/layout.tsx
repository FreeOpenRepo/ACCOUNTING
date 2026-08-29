import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise Accounting Engine',
  description: 'Next.js 16 + .NET 10 Double-Entry Accounting, Partitioned General Ledger, and QuestPDF Tax Invoices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
