import React, { useState } from 'react';

export function KitchenDisplay({ orders, onUpdateOrderStatus, ingredients, products }) {
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = orders.filter(o => {
    return filterStatus === 'All' || o.status === filterStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'New': return 'bg-amber-500/15 text-amber-900 border-amber-500/30 animate-pulse';
      case 'Preparing': return 'bg-blue-500/15 text-blue-900 border-blue-500/30';
      case 'Ready': return 'bg-emerald-500/15 text-emerald-900 border-emerald-500/30';
      case 'Served': return 'bg-amber-900/10 text-amber-900/60 border-amber-900/10';
      default: return 'bg-amber-900/10 text-amber-900';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Live Kitchen Monitor (KDS)
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Kitchen Display System
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Real-time ticket queue for baristas and kitchen prep staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-extrabold text-[#3C2A21]">Station: Espresso 1 + Kitchen</span>
        </div>
      </div>

      {/* Order Pipeline Progress */}
      <div className="glass-card p-5 rounded-2xl border border-white/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900/60">Order Pipeline</span>
          <span className="text-[10px] font-bold text-amber-900/40">{orders.length} total orders</span>
        </div>
        <div className="space-y-2">
          {['New', 'Preparing', 'Ready', 'Served'].map(status => {
            const count = orders.filter(o => o.status === status).length;
            const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
            if (count === 0) return null;
            return (
              <div key={status}>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className={status === 'New' ? 'text-amber-700' : status === 'Preparing' ? 'text-blue-700' : status === 'Ready' ? 'text-emerald-700' : 'text-zinc-500'}>{status}</span>
                  <span className="text-amber-900/50">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full animate-progress-in ${
                      status === 'New' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
                      status === 'Preparing' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                      status === 'Ready' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
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

      {/* Filter Tabs */}
      <div className="flex bg-amber-900/10 p-1.5 rounded-2xl max-w-xl">
        {['All', 'New', 'Preparing', 'Ready', 'Served'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              filterStatus === st
                ? 'bg-[#3C2A21] text-amber-100 shadow-md'
                : 'text-amber-900/70 hover:text-[#3C2A21]'
            }`}
          >
            {st} ({orders.filter(o => st === 'All' || o.status === st).length})
          </button>
        ))}
      </div>

      {/* Live Order Cards Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className={`glass-card rounded-3xl border border-white/60 p-5 flex flex-col justify-between space-y-4 shadow-xl transition-transform hover:scale-[1.01] ${
              order.status === 'New' ? 'ring-2 ring-amber-500/60 bg-amber-500/5' : ''
            }`}
          >
            <div>
              {/* Header Header */}
              <div className="flex items-center justify-between border-b border-amber-900/10 pb-3 mb-3">
                <div>
                  <span className="font-heading font-extrabold text-xl text-[#3C2A21]">{order.id}</span>
                  <p className="text-[11px] text-amber-900/60 font-semibold">{order.type}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="text-[10px] font-bold text-amber-900/60 mt-1">⏱️ {order.timeElapsed}</p>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2.5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10 text-xs">
                    <p className="font-extrabold text-[#3C2A21]">{item.name}</p>
                    {item.note && (
                      <p className="text-[10px] text-[#C08552] font-bold mt-0.5">Note: {item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Status Transition Action Buttons */}
            <div className="pt-3 border-t border-amber-900/10 space-y-2">
              {order.status === 'New' && (
                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'Preparing')}
                  className="w-full py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold hover:brightness-110 shadow"
                >
                  ▶ Accept & Start Preparing
                </button>
              )}

              {order.status === 'Preparing' && (
                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'Ready')}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-amber-100 text-xs font-bold hover:brightness-110 shadow"
                >
                  ✓ Mark Order Ready
                </button>
              )}

              {order.status === 'Ready' && (
                <button
                  onClick={() => onUpdateOrderStatus(order.id, 'Served')}
                  className="w-full py-2.5 rounded-xl bg-amber-900/20 text-[#3C2A21] text-xs font-bold hover:bg-amber-900/30"
                >
                  🛎️ Mark Served & Archival
                </button>
              )}

              {order.status === 'Served' && (
                <div className="py-2 text-center text-xs font-bold text-emerald-800 bg-emerald-500/10 rounded-xl">
                  Order Complete & Recipe Stock Deducted
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
