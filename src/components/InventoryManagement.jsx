import React from 'react';

export function InventoryManagement({
  ingredients,
  movements,
  purchaseOrders,
  suppliers,
  onNavigate
}) {
  const lowStockItems = ingredients.filter(ing => ing.status === 'Low Stock' || (ing.stock > 0 && ing.stock <= ing.minStock));
  const outOfStockItems = ingredients.filter(ing => ing.status === 'Out of Stock' || ing.stock === 0);
  const totalAssetValue = ingredients.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0);
  const pendingOrders = purchaseOrders.filter(po => po.status !== 'Completed');
  const recentMovements = movements.slice(0, 4);

  const categoryValue = ingredients.reduce((acc, ing) => {
    acc[ing.category] = (acc[ing.category] || 0) + ing.stock * ing.costPerUnit;
    return acc;
  }, {});
  const totalCategoryValue = Object.values(categoryValue).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Warehouse Operations Center
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Inventory Dashboard
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Stock levels, supplier coordination, and asset valuation at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onNavigate('inventory', 'ingredients')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-bold shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all">
            Manage Stock
          </button>
          <button onClick={() => onNavigate('inventory', 'purchase_orders')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5E6D3] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/15 transition-all border border-amber-900/10 shadow-sm">
            Purchase Orders
          </button>
          <button onClick={() => onNavigate('inventory', 'suppliers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFDF9] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/5 transition-all border border-amber-900/20 shadow-sm">
            Suppliers
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Total Ingredients</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">{ingredients.length}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">{suppliers.length} suppliers active</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Low Stock Items</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[10px]">Needs Attention</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">{lowStockItems.length}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">Below minimum threshold</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Out of Stock</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 text-[10px]">Critical</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">{outOfStockItems.length}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">Requires immediate order</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Inventory Value</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">Asset</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">${totalAssetValue.toFixed(2)}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">Total stock on hand</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Pending Orders</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 text-[10px]">In Pipeline</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">{pendingOrders.length}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">Awaiting fulfillment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Inventory by Category</h3>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(categoryValue).slice(0, 5).map(([cat, val]) => {
              const pct = totalCategoryValue > 0 ? (val / totalCategoryValue * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs font-semibold text-amber-900/70 mb-1">
                    <span className="font-bold text-[#3C2A21]">{cat}</span>
                    <span>${val.toFixed(2)} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-amber-900/10">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-[#C08552] to-[#693F27] transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Status Overview</h3>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'In Stock', count: ingredients.filter(i => i.status === 'In Stock').length, color: 'bg-emerald-500', pct: Math.round(ingredients.filter(i => i.status === 'In Stock').length / ingredients.length * 100) },
              { label: 'Low Stock', count: lowStockItems.length, color: 'bg-amber-500', pct: Math.round(lowStockItems.length / ingredients.length * 100) },
              { label: 'Out of Stock', count: outOfStockItems.length, color: 'bg-red-500', pct: Math.round(outOfStockItems.length / ingredients.length * 100) },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-900/70">{s.label}</span>
                  <span className="font-bold text-[#3C2A21]">{s.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-900/10">
                  <div className={`h-2 rounded-full ${s.color} transition-all duration-500`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Low Stock Alerts</h3>
            <button onClick={() => onNavigate('inventory', 'ingredients')}
              className="text-xs font-bold text-[#C08552] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {lowStockItems.concat(outOfStockItems).slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFDF9]/80 border border-amber-900/10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${item.stock === 0 ? 'bg-red-500/10 text-red-700 border border-red-500/20' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                    }`}>
                    {item.stock === 0 ? '!' : '!'}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#3C2A21]">{item.name}</h4>
                    <p className="text-[11px] text-amber-900/60 font-medium">Min: {item.minStock} {item.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-extrabold rounded-lg inline-block ${item.stock === 0 ? 'bg-red-500/15 text-red-700' : 'bg-amber-500/15 text-amber-900'
                    }`}>
                    {item.stock} {item.unit}
                  </span>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
              <p className="text-xs text-amber-900/40 font-semibold text-center py-6">All ingredients are well-stocked.</p>
            )}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Recent Movements</h3>
            <button onClick={() => onNavigate('inventory', 'stock_movements')}
              className="text-xs font-bold text-[#C08552] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {recentMovements.map((mov) => (
              <div key={mov.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFDF9]/60 border border-amber-900/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${mov.quantity.startsWith('+') ? 'bg-emerald-500' : 'bg-red-400'
                    }`} />
                  <div>
                    <h4 className="font-bold text-xs text-[#3C2A21]">{mov.ingredientName}</h4>
                    <p className="text-[10px] text-amber-900/50 font-medium">{mov.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-extrabold ${mov.quantity.startsWith('+') ? 'text-emerald-700' : 'text-red-600'}`}>
                    {mov.quantity}
                  </span>
                  <p className="text-[10px] text-amber-900/40">{mov.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
