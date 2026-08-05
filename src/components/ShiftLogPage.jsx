import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const fmtMoney = (v) => `$${(v == null ? 0 : Number(v)).toFixed(2)}`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export function ShiftLogPage() {
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null); // null = All
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        console.warn('Error loading shift logs:', err);
        setError('Failed to load shift logs from server.');
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

  const allTotalCash = branchTotals.reduce((sum, b) => sum + b.totalCash, 0);
  const allCount = shifts.length;
  const allMatched = shifts.filter(s => s.status === 'Matched').length;

  const filtered = selectedBranch === null
    ? shifts
    : shifts.filter(s => s.branch_id === selectedBranch);

  const activeName = selectedBranch === null
    ? 'All Branches'
    : branches.find(b => b.id === selectedBranch)?.name || 'Branch';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Shift Log</h2>
        <p className="text-xs text-amber-900/55 font-medium">Staff shift history and cash reconciliation across all branches</p>
      </div>

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
            onClick={() => setSelectedBranch(null)}
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
                <span>Cash handled</span>
                <span className="font-extrabold text-[#3C2A21]">{fmtMoney(allTotalCash)}</span>
              </div>
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
              onClick={() => setSelectedBranch(b.id)}
              className={`text-left glass-card p-4 rounded-xl border transition-all duration-200 ${
                selectedBranch === b.id
                  ? 'ring-2 ring-[#C08552] bg-amber-900/10 border-[#C08552]/40'
                  : 'border-white/60 hover:border-amber-900/20 hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-extrabold text-sm text-[#3C2A21] truncate">{b.name}</span>
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

      {/* Recent Shift Logs for the selected branch */}
      <div className="glass-card rounded-2xl border border-white/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-5">Cashier</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Opening</th>
                  <th className="py-3.5 px-4">Expected</th>
                  <th className="py-3.5 px-4">Actual</th>
                  <th className="py-3.5 px-4">Variance</th>
                  <th className="py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/8 text-xs font-semibold">
                {filtered.map((shf) => (
                  <tr key={shf.id} className="hover:bg-amber-900/4 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#3C2A21]">{shf.cashier}</td>
                    <td className="py-3.5 px-4 text-amber-900/70">{fmtDate(shf.opened_at)}</td>
                    <td className="py-3.5 px-4 text-amber-900/70 whitespace-nowrap">
                      {fmtTime(shf.opened_at)} — {fmtTime(shf.closed_at)}
                    </td>
                    <td className="py-3.5 px-4">{fmtMoney(shf.opening_cash)}</td>
                    <td className="py-3.5 px-4">{fmtMoney(shf.expected_cash)}</td>
                    <td className="py-3.5 px-4">{fmtMoney(shf.actual_cash)}</td>
                    <td className={`py-3.5 px-4 font-bold ${
                      shf.difference === null ? 'text-amber-900/40' : (Math.abs(shf.difference) < 0.005 ? 'text-emerald-700' : 'text-red-700')
                    }`}>
                      {fmtMoney(shf.difference)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        shf.status === 'Matched' ? 'bg-emerald-500/10 text-emerald-800'
                        : shf.status === 'Open' ? 'bg-blue-500/10 text-blue-700'
                        : 'bg-amber-500/12 text-amber-900'
                      }`}>
                        {shf.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
