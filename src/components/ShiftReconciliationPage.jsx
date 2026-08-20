import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Icons } from './Icons';
import { ShiftReportModal } from './ShiftReportModal';

const fmtMoney = (v) => `$${(v == null ? 0 : Number(v)).toFixed(2)}`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export function ShiftReconciliationPage() {
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null); // null = All
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [reportShiftId, setReportShiftId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openingCash, setOpeningCash] = useState(150.00);
  const [actualCash, setActualCash] = useState(612.20);
  const [cashSales, setCashSales] = useState(462.20);
  const [digitalPayments, setDigitalPayments] = useState(820.50);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [shiftsRes, branchesRes] = await Promise.allSettled([
          api.getShifts(),
          api.getBranches(),
        ]);
        if (shiftsRes.status === 'fulfilled' && Array.isArray(shiftsRes.value)) {
          setShifts(shiftsRes.value);
        }
        if (branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value)) {
          setBranches(branchesRes.value);
        }
        setError('');
      } catch (err) {
        console.warn('Error loading shift reconciliation:', err);
        setError('Failed to load shift reconciliation data from server.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const branchTotals = branches.map((b) => {
    const list = shifts.filter(s => s.branch_id === b.id);
    const totalCash = list.reduce((sum, s) => sum + (s.opening_cash || 0) + (s.cash_sales || 0), 0);
    const matched = list.filter(s => s.status === 'Matched').length;
    const open = list.filter(s => s.status === 'Open').length;
    return { ...b, count: list.length, totalCash, matched, open };
  });

  const allCount = shifts.length;
  const allMatched = shifts.filter(s => s.status === 'Matched').length;

  const filtered = selectedBranch === null
    ? shifts
    : shifts.filter(s => s.branch_id === selectedBranch);

  const activeName = selectedBranch === null
    ? 'All Branches'
    : branches.find(b => b.id === selectedBranch)?.name || 'Branch';

  const expectedCash = Number(openingCash) + Number(cashSales);
  const difference = Number(actualCash) - expectedCash;

  const populateAudit = (branchId) => {
    const list = branchId === null
      ? shifts
      : shifts.filter(s => s.branch_id === branchId);
    setOpeningCash(list.reduce((sum, s) => sum + (s.opening_cash || 0), 0));
    setCashSales(list.reduce((sum, s) => sum + (s.cash_sales || 0), 0));
    setDigitalPayments(list.reduce((sum, s) => sum + (s.digital_payments || 0), 0));
    setActualCash(list.reduce((sum, s) => sum + (s.actual_cash || 0), 0));
  };

  const selectBranch = (branchId) => {
    setSelectedBranch(branchId);
    setSelectedShiftId(null);
    populateAudit(branchId);
  };

  const selectShiftLog = (shf) => {
    setSelectedShiftId(shf.id);
    setOpeningCash(shf.opening_cash || 0);
    setCashSales(shf.cash_sales || 0);
    setDigitalPayments(shf.digital_payments || 0);
    setActualCash(shf.actual_cash === null ? '' : shf.actual_cash);
  };

  const handleReconcileShift = async (e) => {
    e.preventDefault();
    if (!selectedShiftId) {
      setShiftSuccessMsg('Select a shift log first to update it.');
      setTimeout(() => setShiftSuccessMsg(''), 5000);
      return;
    }
    try {
      await api.updateShift(selectedShiftId, {
        cash_drawer_start: Number(openingCash),
        cash_drawer_end: actualCash === '' ? undefined : Number(actualCash),
      });
      setShiftSuccessMsg(`Shift #${selectedShiftId} updated! Variance: ${difference === 0 ? '$0.00 (Perfect Match)' : `$${difference.toFixed(2)}`}`);
      const res = await api.getShifts();
      if (Array.isArray(res)) setShifts(res);
      setSelectedShiftId(null);
    } catch (err) {
      console.error('Failed to update shift:', err);
      setShiftSuccessMsg('Failed to update shift. Check the server connection.');
    }
    setTimeout(() => setShiftSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Branch Container */}
      <div className="glass-card p-5 rounded-2xl border border-white/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-extrabold text-sm text-[#3C2A21]">Branches</h3>
          <span className="text-[11px] font-bold text-amber-900/50">{branches.length} total</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* All Branches cell */}
          <button
            type="button"
            onClick={() => selectBranch(null)}
            className={`text-left glass-card p-4 rounded-xl border transition-all duration-200 ${
              selectedBranch === null
                ? 'ring-2 ring-[#C08552] bg-amber-900/10 border-[#C08552]/40'
                : 'border-white/60 hover:border-amber-900/20 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading font-extrabold text-sm text-[#3C2A21]">All Branches</span>
              <span className="px-2 py-0.5 rounded-full bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold">
                {allCount} shifts
              </span>
            </div>
            <p className="text-[11px] text-amber-900/50 font-medium">Company-wide overview</p>
            <div className="mt-3 pt-2.5 border-t border-amber-900/10 space-y-1 text-[11px] font-semibold">
              <div className="flex justify-between text-amber-900/60">
                <span>Matched</span>
                <span className="font-extrabold text-emerald-700">{allMatched}/{allCount}</span>
              </div>
            </div>
          </button>

          {/* Branch cells */}
          {branchTotals.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={!b.is_active}
              onClick={() => selectBranch(b.id)}
              className={`text-left glass-card p-4 rounded-xl border transition-all duration-200 ${
                b.is_active === false
                  ? 'opacity-50 grayscale cursor-not-allowed border-amber-900/10'
                  : selectedBranch === b.id
                    ? 'ring-2 ring-[#C08552] bg-amber-900/10 border-[#C08552]/40'
                    : 'border-white/60 hover:border-amber-900/20 hover:scale-[1.01]'
              }`}
              aria-disabled={b.is_active === false}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-heading font-extrabold text-sm text-[#3C2A21] truncate">{b.name}</span>
                  {b.is_main && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-[9px] font-extrabold uppercase tracking-wide whitespace-nowrap shadow-sm">
                      <Icons.Star className="w-2.5 h-2.5" />Main
                    </span>
                  )}
                  {b.is_active === false && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-700 text-[9px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                      Inactive
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-900/10 text-[10px] font-extrabold text-[#693F27] whitespace-nowrap ml-2">
                  {b.count} shifts
                </span>
              </div>
              <p className="text-[11px] text-amber-900/50 font-medium truncate">{b.address || 'No address'}</p>
              <div className="mt-3 pt-2.5 border-t border-amber-900/10 space-y-1 text-[11px] font-semibold">
                <div className="flex justify-between text-amber-900/60">
                  <span>Cash handled</span>
                  <span className="font-extrabold text-[#3C2A21]">{fmtMoney(b.totalCash)}</span>
                </div>
                <div className="flex justify-between text-amber-900/60">
                  <span>Matched</span>
                  <span className={`font-extrabold ${b.open ? 'text-blue-700' : 'text-emerald-700'}`}>
                    {b.matched}/{b.count}{b.open ? ' · open' : ''}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main area: audit form + recent shift logs for selected branch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-5">
          <div>
            <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Shift Cash Drawer Audit</h3>
            <p className="text-xs text-amber-900/55 font-medium">{activeName}</p>
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
                <span className="font-bold text-[#3C2A21]">${Number(cashSales).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-900/65">
                <span>+ Digital Payments:</span>
                <span className="font-bold text-[#3C2A21]">${Number(digitalPayments).toFixed(2)}</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Recent Shift Logs</h3>
              <p className="text-[11px] text-amber-900/55 font-medium">{activeName}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#693F27]/10 text-[#693F27] text-[11px] font-extrabold">
              {filtered.length} {filtered.length === 1 ? 'shift' : 'shifts'}
            </span>
          </div>
          {loading ? (
            <p className="p-6 text-center text-xs font-bold text-amber-900/50">Loading shift logs...</p>
          ) : error ? (
            <p className="p-6 text-center text-xs font-bold text-red-700">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-xs font-bold text-amber-900/50">No shift logs found for {activeName}.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 pr-4">Staff</th>
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Shift Hours</th>
                    <th className="py-3 pr-4">Opening</th>
                    <th className="py-3 pr-4">Expected</th>
                    <th className="py-3 pr-4">Actual</th>
                    <th className="py-3 pr-4">Diff</th>
                    <th className="py-3">Status</th>
                    <th className="py-3 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-900/8 text-xs font-semibold">
                  {filtered.map((shf) => (
                    <tr key={shf.id}
                      onClick={() => selectShiftLog(shf)}
                      className={`cursor-pointer transition-colors ${
                        selectedShiftId === shf.id
                          ? 'bg-[#C08552]/15 hover:bg-[#C08552]/20'
                          : 'hover:bg-amber-900/4'
                      }`}>
                      <td className="py-3.5 pr-4 font-bold text-[#3C2A21]">{shf.cashier}</td>
                      <td className="py-3.5 pr-4 text-amber-900/55">{fmtDate(shf.opened_at)}</td>
                      <td className="py-3.5 pr-4 text-amber-900/55 whitespace-nowrap">
                        {fmtTime(shf.opened_at)} - {fmtTime(shf.closed_at)}
                      </td>
                      <td className="py-3.5 pr-4">{fmtMoney(shf.opening_cash)}</td>
                      <td className="py-3.5 pr-4">{fmtMoney(shf.expected_cash)}</td>
                      <td className="py-3.5 pr-4">{fmtMoney(shf.actual_cash)}</td>
                      <td className={`py-3.5 pr-4 font-bold ${
                        shf.difference === null ? 'text-amber-900/40' : (Math.abs(shf.difference) < 0.005 ? 'text-emerald-700' : 'text-red-700')
                      }`}>
                        {fmtMoney(shf.difference)}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          shf.status === 'Matched' ? 'bg-emerald-500/10 text-emerald-800'
                          : shf.status === 'Open' ? 'bg-blue-500/10 text-blue-700'
                          : 'bg-amber-500/12 text-amber-900'
                        }`}>{shf.status}</span>
                      </td>
                      <td className="py-3.5 pl-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReportShiftId(shf.id); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C08552]/15 text-[#693F27] text-[10px] font-extrabold hover:bg-[#C08552]/25 transition-colors"
                        >
                          <Icons.Eye className="w-3.5 h-3.5" />
                          View Full
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reportShiftId !== null && (
        <ShiftReportModal shiftId={reportShiftId} onClose={() => setReportShiftId(null)} />
      )}
    </div>
  );
}
