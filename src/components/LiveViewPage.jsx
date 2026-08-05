import React from 'react';

const STATUS_STYLES = {
  'New': 'bg-amber-500/15 text-amber-800 border-amber-300/30',
  'Preparing': 'bg-blue-500/15 text-blue-800 border-blue-300/30',
  'Ready': 'bg-emerald-500/15 text-emerald-800 border-emerald-300/30',
  'Served': 'bg-zinc-500/10 text-zinc-600 border-zinc-300/20',
};

export function LiveViewPage({ orders }) {
  const activeOrders = orders.filter(o => o.status !== 'Served');

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Live View</h2>
          <p className="text-xs text-amber-900/55 font-medium">Real-time order activity</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-900/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {activeOrders.length} active orders
        </div>
      </div>

      {/* Active Order Status */}
      <div className="glass-card p-5 rounded-2xl border border-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900/60">Active Order Status</span>
          <span className="text-[10px] font-bold text-amber-900/40">{activeOrders.length} active</span>
        </div>
        <div className="space-y-2">
          {['New', 'Preparing', 'Ready'].map(status => {
            const count = activeOrders.filter(o => o.status === status).length;
            const pct = activeOrders.length > 0 ? Math.round((count / activeOrders.length) * 100) : 0;
            if (count === 0 && activeOrders.length === 0) return null;
            if (count === 0) return null;
            return (
              <div key={status}>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className={status === 'New' ? 'text-amber-700' : status === 'Preparing' ? 'text-blue-700' : 'text-emerald-700'}>{status}</span>
                  <span className="text-amber-900/50">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-progress-in ${
                      status === 'New' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
                      status === 'Preparing' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                      'bg-gradient-to-r from-emerald-500 to-green-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeOrders.map((order) => (
          <div key={order.id} className="glass-card rounded-2xl border border-white/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading font-extrabold text-lg text-[#3C2A21]">{order.id}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[order.status]}`}>
                {order.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-900/60">
              <span>{order.type}</span>
              <span>·</span>
              <span>{order.timeElapsed}</span>
            </div>
            <div className="space-y-1">
              {order.items.map((item, idx) => (
                <p key={idx} className="text-xs font-semibold text-[#3C2A21]">
                  {item.name}
                  {item.note && <span className="text-amber-900/50 font-medium"> — {item.note}</span>}
                </p>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-900/50">{order.customer}</span>
              <span className="font-extrabold text-[#3C2A21]">${order.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
        {activeOrders.length === 0 && (
          <div className="col-span-full text-center py-12 text-amber-900/40 font-semibold text-sm">
            No active orders at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
