import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

export function ReportsView({ shifts, ingredients, products }) {
  const [activePage, setActivePage] = useState('sales');
  const [filterPeriod, setFilterPeriod] = useState('Daily');
  const [openingCash, setOpeningCash] = useState(150.00);
  const [actualCash, setActualCash] = useState(612.20);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState('');
  const [apiReport, setApiReport] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const reportData = await api.getSalesReport();
        setApiReport(reportData);
      } catch (err) {
        console.warn('API error fetching sales report:', err);
      }
    };
    fetchReportData();
  }, []);

  const cashSales = apiReport?.paymentMethods?.find(m => m.method === 'cash')?.total_amount || 462.20;
  const digitalPayments = apiReport?.paymentMethods?.filter(m => m.method !== 'cash').reduce((acc, curr) => acc + parseFloat(curr.total_amount || 0), 0) || 820.50;
  const expectedCash = Number(openingCash) + Number(cashSales);
  const difference = Number(actualCash) - expectedCash;

  const handleReconcileShift = async (e) => {
    e.preventDefault();
    try {
      await api.closeShift({ shift_id: 1, cash_drawer_end: parseFloat(actualCash) });
    } catch (err) {
      console.warn('Shift close API call fallback:', err);
    }
    setShiftSuccessMsg(`Shift reconciled! Variance: ${difference === 0 ? '$0.00 (Perfect Match ✅)' : `$${difference.toFixed(2)}`}`);
    setTimeout(() => setShiftSuccessMsg(''), 5000);
  };

  const handleExport = (format) => {
    alert(`Exporting ${activePage.toUpperCase()} report as ${format}...`);
  };

  const PAGES = [
    { id: 'sales',       label: 'Sales Report',          icon: '💰', desc: 'Revenue & orders' },
    { id: 'bestsellers', label: 'Best Sellers',           icon: '🏆', desc: 'Top products' },
    { id: 'inventory',   label: 'Inventory Valuation',   icon: '📦', desc: 'Asset report' },
    { id: 'shifts',      label: 'Shift Reconciliation',  icon: '⚖️', desc: 'Cash drawer audit' },
  ];

  const currentPage = PAGES.find(p => p.id === activePage);

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── Top Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Business Intelligence & Audit
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Reports & Analytics</h2>
          <p className="text-xs text-amber-900/60 font-medium mt-0.5">
            Financial metrics, shift reconciliation, inventory valuation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('PDF')}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110">
            📄 PDF
          </button>
          <button onClick={() => handleExport('Excel')}
            className="px-3 py-2 rounded-xl bg-[#F5E6D3] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/12 border border-amber-900/10">
            📊 Excel
          </button>
          <button onClick={() => handleExport('CSV')}
            className="px-3 py-2 rounded-xl bg-[#FFFDF9] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/5 border border-amber-900/15">
            📋 CSV
          </button>
        </div>
      </div>

      {/* ── Page Layout ── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left: Vertical Page Navigation */}
        <nav className="lg:w-52 shrink-0">
          <div className="glass-card rounded-2xl border border-white/60 p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {PAGES.map((page) => {
              const isActive = activePage === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 min-w-max lg:min-w-0 w-full ${
                    isActive
                      ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                      : 'text-[#4A2E2A]/75 hover:bg-amber-900/8 hover:text-[#3C2A21]'
                  }`}
                >
                  <span className="text-sm shrink-0">{page.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight">{page.label}</p>
                    <p className={`text-[10px] font-medium mt-0.5 hidden lg:block ${isActive ? 'text-amber-300/60' : 'text-amber-900/40'}`}>
                      {page.desc}
                    </p>
                  </div>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden lg:block" />}
                </button>
              );
            })}
          </div>

          {/* Period Filter */}
          <div className="mt-3 glass-card rounded-2xl border border-white/60 p-2 flex lg:flex-col gap-1">
            <p className="text-[10px] font-extrabold text-amber-900/40 uppercase tracking-widest px-2 py-1 hidden lg:block">Period</p>
            {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`flex-1 lg:flex-none px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                  filterPeriod === p ? 'bg-amber-900/15 text-[#3C2A21]' : 'text-amber-900/55 hover:text-[#3C2A21]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </nav>

        {/* Right: Page Content */}
        <div className="flex-1 min-w-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-xs text-amber-900/50 font-semibold">
            <span>Reports</span>
            <span>›</span>
            <span className="text-[#3C2A21] font-bold">{currentPage?.label}</span>
            <span className="ml-auto px-2 py-0.5 rounded-lg bg-amber-900/8 text-amber-900/60 text-[11px] font-bold">{filterPeriod}</span>
          </div>

          {/* ── Sales Report ── */}
          {activePage === 'sales' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Gross Revenue', value: '$4,285.50', badge: '+12.4%', good: true },
                  { label: 'Total Orders', value: '312', badge: '+8.2%', good: true },
                  { label: 'Discounts Applied', value: '$142.00', badge: '4.8% promo', good: null },
                  { label: 'VAT 12%', value: '$514.26', badge: 'Collected', good: null },
                ].map((s) => (
                  <div key={s.label} className="glass-card p-5 rounded-2xl border border-white/60">
                    <span className="text-xs font-bold text-amber-900/55">{s.label}</span>
                    <p className="font-heading font-extrabold text-2xl text-[#3C2A21] mt-1">{s.value}</p>
                    <span className={`text-[10px] font-bold ${s.good ? 'text-emerald-700' : 'text-amber-900/50'}`}>{s.badge}</span>
                  </div>
                ))}
              </div>

              {/* Payment Breakdown */}
              <div className="glass-card p-6 rounded-2xl border border-white/60">
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21] mb-4">Payment Method Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { method: 'Cash', amount: 462.20, pct: 35 },
                    { method: 'GCash / Maya', amount: 512.50, pct: 42 },
                    { method: 'Credit / Debit Card', amount: 308.00, pct: 23 },
                  ].map((pm) => (
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
          )}

          {/* ── Best Sellers ── */}
          {activePage === 'bestsellers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
              <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-4">
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">☕ Most Ordered Drinks</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Iced Brewtura Latte', units: 142, revenue: '$674.50' },
                    { name: 'Single Origin Espresso', units: 98, revenue: '$318.50' },
                    { name: 'Ceremonial Matcha Latte', units: 64, revenue: '$336.00' },
                    { name: 'Earl Lavender Milk Tea', units: 42, revenue: '$207.90' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[#FFFDF9]/60 border border-amber-900/10 text-xs">
                      <div>
                        <span className="font-bold text-[#3C2A21]">{item.name}</span>
                        <p className="text-[10px] text-emerald-700 font-bold">{item.units} units sold</p>
                      </div>
                      <span className="font-extrabold text-[#3C2A21]">{item.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-4">
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">🥐 Most Ordered Food</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Butter Croissant', units: 45, revenue: '$186.75' },
                    { name: 'Avocado Toast', units: 28, revenue: '$196.00' },
                    { name: 'Blueberry Muffin', units: 22, revenue: '$82.50' },
                    { name: 'Dark Chocolate Cookie', units: 18, revenue: '$45.00' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[#FFFDF9]/60 border border-amber-900/10 text-xs">
                      <div>
                        <span className="font-bold text-[#3C2A21]">{item.name}</span>
                        <p className="text-[10px] text-emerald-700 font-bold">{item.units} units sold</p>
                      </div>
                      <span className="font-extrabold text-[#3C2A21]">{item.revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Inventory Valuation ── */}
          {activePage === 'inventory' && (
            <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Inventory Valuation Report</h3>
                  <p className="text-[11px] text-amber-900/55 font-medium">Estimated total asset value</p>
                </div>
                <span className="text-sm font-extrabold text-[#3C2A21]">
                  ${ingredients.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0).toFixed(2)}
                </span>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                      <th className="py-3 pr-4">Ingredient</th>
                      <th className="py-3 pr-4">Stock</th>
                      <th className="py-3 pr-4">Unit Cost</th>
                      <th className="py-3 pr-4">Asset Value</th>
                      <th className="py-3">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/8 text-xs font-semibold">
                    {ingredients.map((ing) => (
                      <tr key={ing.id} className="hover:bg-amber-900/4 transition-colors">
                        <td className="py-3.5 pr-4 font-bold text-[#3C2A21]">{ing.name}</td>
                        <td className="py-3.5 pr-4 text-amber-900/70">{ing.stock} {ing.unit}</td>
                        <td className="py-3.5 pr-4">${ing.costPerUnit.toFixed(2)}</td>
                        <td className="py-3.5 pr-4 font-extrabold text-[#3C2A21]">${(ing.stock * ing.costPerUnit).toFixed(2)}</td>
                        <td className="py-3.5">
                          <span className={`text-[11px] font-bold ${ing.status === 'Out of Stock' ? 'text-red-700' : ing.status === 'Low Stock' ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {ing.status === 'Out of Stock' ? 'High Risk' : ing.status === 'Low Stock' ? 'Watch' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Shift Reconciliation ── */}
          {activePage === 'shifts' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fadeIn">
              <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-5">
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Shift Cash Drawer Audit</h3>
                  <p className="text-xs text-amber-900/55 font-medium">Reconcile opening vs counted cash</p>
                </div>
                {shiftSuccessMsg && (
                  <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 rounded-xl font-bold">
                    {shiftSuccessMsg}
                  </div>
                )}
                <form onSubmit={handleReconcileShift} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Opening Cash Till ($)</label>
                    <input type="number" step="0.01" value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]" />
                  </div>
                  <div className="p-3 rounded-xl bg-amber-900/5 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between text-amber-900/65">
                      <span>+ Cash Sales Today:</span>
                      <span className="font-bold text-[#3C2A21]">${cashSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-900/65">
                      <span>+ Digital Payments:</span>
                      <span className="font-bold text-[#3C2A21]">${digitalPayments.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-amber-900/10 pt-2 font-extrabold text-[#3C2A21]">
                      <span>Expected Cash:</span>
                      <span>${expectedCash.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Actual Physical Cash ($)</label>
                    <input type="number" step="0.01" value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-extrabold text-[#3C2A21]" />
                  </div>
                  <div className={`p-3 rounded-xl text-xs font-bold flex justify-between ${
                    difference === 0 ? 'bg-emerald-500/12 text-emerald-900' : 'bg-red-500/12 text-red-900'
                  }`}>
                    <span>Variance:</span>
                    <span className="font-extrabold">${difference.toFixed(2)}</span>
                  </div>
                  <button type="submit"
                    className="w-full py-3 rounded-xl bg-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-md hover:brightness-110">
                    Submit Reconciliation
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/60 space-y-5">
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Recent Shift Logs</h3>
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="py-3 pr-4">Staff</th>
                        <th className="py-3 pr-4">Shift Hours</th>
                        <th className="py-3 pr-4">Opening</th>
                        <th className="py-3 pr-4">Expected</th>
                        <th className="py-3 pr-4">Actual</th>
                        <th className="py-3 pr-4">Diff</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-900/8 text-xs font-semibold">
                      {shifts.map((shf) => (
                        <tr key={shf.id} className="hover:bg-amber-900/4 transition-colors">
                          <td className="py-3.5 pr-4 font-bold text-[#3C2A21]">{shf.cashier}</td>
                          <td className="py-3.5 pr-4 text-amber-900/55">{shf.openTime} - {shf.closeTime}</td>
                          <td className="py-3.5 pr-4">${shf.openingCash.toFixed(2)}</td>
                          <td className="py-3.5 pr-4">${shf.expectedCash.toFixed(2)}</td>
                          <td className="py-3.5 pr-4">${shf.actualCash.toFixed(2)}</td>
                          <td className={`py-3.5 pr-4 font-bold ${shf.difference === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            ${shf.difference.toFixed(2)}
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              shf.status === 'Matched' ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/12 text-amber-900'
                            }`}>{shf.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>{/* end right content */}
      </div>{/* end layout */}
    </div>
  );
}
