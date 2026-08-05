import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const DEMO_SUMMARY = [
  { label: 'Gross Revenue', value: '$4,285.50', badge: '+12.4%', good: true },
  { label: 'Total Orders', value: '312', badge: '+8.2%', good: true },
  { label: 'Discounts Applied', value: '$142.00', badge: '4.8% promo', good: null },
  { label: 'VAT 12%', value: '$514.26', badge: 'Collected', good: null },
];

const DEMO_PAYMENTS = [
  { method: 'Cash', amount: 462.20, pct: 35 },
  { method: 'GCash / Maya', amount: 512.50, pct: 42 },
  { method: 'Credit / Debit Card', amount: 308.00, pct: 23 },
];

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesReportPage({ filterPeriod, onSetFilterPeriod, handleExport }) {
  const [report, setReport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getSalesReport()
      .then((data) => { if (!cancelled) setReport(data); })
      .catch((err) => console.warn('API error fetching sales report:', err));
    return () => { cancelled = true; };
  }, []);

  const summary = report?.summary;
  const summaryCards = summary
    ? [
        { label: 'Gross Revenue', value: fmtMoney(summary.gross_sales), badge: 'Live', good: true },
        { label: 'Total Orders', value: String(summary.total_orders ?? 0), badge: 'Live', good: true },
        { label: 'Discounts Applied', value: fmtMoney(summary.gross_discounts), badge: 'Live', good: null },
        { label: 'VAT 12%', value: fmtMoney(summary.gross_tax), badge: 'Collected', good: null },
      ]
    : DEMO_SUMMARY;

  const paymentMethods = report?.paymentMethods;
  const payments = paymentMethods && paymentMethods.length
    ? (() => {
        const total = paymentMethods.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0) || 1;
        return paymentMethods.map((p) => ({
          method: p.method,
          amount: parseFloat(p.total_amount || 0),
          pct: Math.round((parseFloat(p.total_amount || 0) / total) * 100),
        }));
      })()
    : DEMO_PAYMENTS;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="glass-card p-5 rounded-2xl border border-white/60">
            <span className="text-xs font-bold text-amber-900/55">{s.label}</span>
            <p className="font-heading font-extrabold text-2xl text-[#3C2A21] mt-1">{s.value}</p>
            <span className={`text-[10px] font-bold ${s.good ? 'text-emerald-700' : 'text-amber-900/50'}`}>{s.badge}</span>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 rounded-2xl border border-white/60">
        <h3 className="font-heading font-extrabold text-base text-[#3C2A21] mb-4">Payment Method Breakdown</h3>
        <div className="space-y-3">
          {payments.map((pm) => (
            <div key={pm.method}>
              <div className="flex justify-between text-xs font-semibold text-amber-900/70 mb-1">
                <span className="font-bold text-[#3C2A21]">{pm.method}</span>
                <span>${pm.amount.toFixed(2)} ({pm.pct}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-amber-900/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#C08552] to-[#693F27] transition-all duration-500"
                  style={{ width: `${pm.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
