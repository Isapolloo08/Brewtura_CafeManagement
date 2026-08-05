import React from 'react';

const ACTIVITIES = [
  { id: 1, action: 'Order #105 marked as New', user: 'System', time: '4 min ago', type: 'order' },
  { id: 2, action: 'Stock adjustment: -2L Whole Milk (Spoilage)', user: 'Marco V.', time: '15 min ago', type: 'inventory' },
  { id: 3, action: 'Shift closed by Julian Chen', user: 'Julian Chen', time: '18 min ago', type: 'shift' },
  { id: 4, action: 'Payment received — GCash $14.75', user: 'POS System', time: '22 min ago', type: 'payment' },
  { id: 5, action: 'New product added: Spanish Latte', user: 'Elena Rossi', time: '1 hr ago', type: 'menu' },
  { id: 6, action: 'PO-8822 status changed to In Transit', user: 'System', time: '2 hr ago', type: 'purchase' },
  { id: 7, action: 'Ingredient restocked: +20kg House Blend Beans', user: 'Sarah Miller', time: '4 hr ago', type: 'inventory' },
  { id: 8, action: 'User login: Marco V. (Administrator)', user: 'System', time: '6 hr ago', type: 'auth' },
  { id: 9, action: 'Daily backup completed', user: 'System', time: '8 hr ago', type: 'system' },
  { id: 10, action: 'Printer configuration updated', user: 'Elena Rossi', time: '1 day ago', type: 'settings' },
];

const TYPE_DOT = {
  order: 'bg-blue-500',
  inventory: 'bg-amber-500',
  shift: 'bg-emerald-500',
  payment: 'bg-violet-500',
  menu: 'bg-rose-500',
  purchase: 'bg-cyan-500',
  auth: 'bg-zinc-500',
  system: 'bg-zinc-400',
  settings: 'bg-zinc-500',
};

export function ActivityHistoryPage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Activity History</h2>
        <p className="text-xs text-amber-900/55 font-medium">Audit trail of system actions</p>
      </div>

      {/* Activity Type Distribution */}
      <div className="glass-card p-5 rounded-2xl border border-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900/60">Activity Type Distribution</span>
          <span className="text-[10px] font-bold text-amber-900/40">{ACTIVITIES.length} total activities</span>
        </div>
        <div className="space-y-2">
          {Object.entries(TYPE_DOT).map(([type, dotColor]) => {
            const count = ACTIVITIES.filter(a => a.type === type).length;
            const pct = Math.round((count / ACTIVITIES.length) * 100);
            if (count === 0) return null;
            return (
              <div key={type}>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className="text-[#3C2A21]">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  <span className="text-amber-900/50">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-progress-in ${
                      type === 'inventory' || type === 'order' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
                      type === 'shift' || type === 'system' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                      type === 'payment' ? 'bg-gradient-to-r from-violet-500 to-purple-600' :
                      type === 'menu' ? 'bg-gradient-to-r from-rose-500 to-pink-600' :
                      type === 'purchase' ? 'bg-gradient-to-r from-cyan-500 to-blue-600' :
                      'bg-gradient-to-r from-zinc-400 to-zinc-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/60 p-6">
        <div className="relative">
          {ACTIVITIES.map((a, idx) => (
            <div key={a.id} className="flex gap-4 pb-6 last:pb-0 relative">
              {idx < ACTIVITIES.length - 1 && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-amber-900/10" />
              )}
              <div className="relative">
                <div className={`w-[15px] h-[15px] rounded-full ${TYPE_DOT[a.type]} ring-2 ring-white`} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-semibold text-[#3C2A21]">{a.action}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-amber-900/45 font-medium">{a.user}</span>
                  <span className="text-[10px] text-amber-900/30">·</span>
                  <span className="text-[10px] text-amber-900/45">{a.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
