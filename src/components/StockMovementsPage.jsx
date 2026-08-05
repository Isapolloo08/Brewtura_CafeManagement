import React from 'react';

export function StockMovementsPage({ movements }) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Audit Trail
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Stock Movements</h2>
          <p className="text-xs text-amber-900/70 font-medium">Real-time movement history</p>
        </div>
      </div>

      {/* Movement Type Distribution */}
      <div className="glass-card p-5 rounded-2xl border border-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900/60">Movement Type Distribution</span>
          <span className="text-[10px] font-bold text-amber-900/40">{movements.length} total movements</span>
        </div>
        <div className="space-y-2">
          {['Stock In', 'Stock Out', 'Spoilage', 'Waste', 'Manual Adjustment'].map(type => {
            const count = movements.filter(m => m.type === type).length;
            const pct = movements.length > 0 ? Math.round((count / movements.length) * 100) : 0;
            if (count === 0) return null;
            return (
              <div key={type}>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className="text-[#3C2A21]">{type}</span>
                  <span className="text-amber-900/50">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-progress-in ${
                      type === 'Stock In' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                      type === 'Spoilage' || type === 'Waste' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                      'bg-gradient-to-r from-amber-500 to-orange-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 pr-4">Timestamp</th>
                <th className="py-3 pr-4">Ingredient</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Quantity</th>
                <th className="py-3 pr-4">Reason</th>
                <th className="py-3">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10 text-xs font-semibold">
              {movements.map((mov) => (
                <tr key={mov.id} className="hover:bg-amber-900/5 transition-colors">
                  <td className="py-3.5 pr-4 text-amber-900/55">{mov.timestamp}</td>
                  <td className="py-3.5 pr-4 font-bold text-[#3C2A21]">{mov.ingredientName}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      mov.type === 'Stock In' ? 'bg-emerald-500/10 text-emerald-800'
                      : mov.type === 'Spoilage' || mov.type === 'Waste' ? 'bg-red-500/10 text-red-800'
                      : 'bg-amber-500/10 text-amber-900'
                    }`}>{mov.type}</span>
                  </td>
                  <td className="py-3.5 pr-4 font-extrabold text-[#3C2A21]">{mov.quantity}</td>
                  <td className="py-3.5 pr-4 text-amber-900/65 font-normal">{mov.reason}</td>
                  <td className="py-3.5 font-bold text-amber-900/75">{mov.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
