import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api.js';

// ─── Demo fallbacks (kept so the dashboard still looks rich when backend has no data) ───
const DEMO_SALES_BY_HOUR = [
  { time: '6 AM', val: 120, height: '25%' },
  { time: '8 AM', val: 420, height: '85%' },
  { time: '10 AM', val: 380, height: '75%' },
  { time: '12 PM', val: 490, height: '95%' },
  { time: '2 PM', val: 310, height: '60%' },
  { time: '4 PM', val: 270, height: '55%' },
  { time: '6 PM', val: 360, height: '70%' },
  { time: '8 PM', val: 190, height: '40%' },
];

const DEMO_BEST_SELLERS = [
  { rank: '1', name: 'Iced Brewtura Latte', sales: '142 sold', revenue: '$674.50', category: 'Drink' },
  { rank: '2', name: 'Single Origin Espresso', sales: '98 sold', revenue: '$318.50', category: 'Drink' },
  { rank: '3', name: 'Ceremonial Matcha Latte', sales: '64 sold', revenue: '$336.00', category: 'Drink' },
  { rank: '4', name: 'Butter Croissant', sales: '45 sold', revenue: '$186.75', category: 'Food' },
];

// ─── Utility helpers ───
function parseHour(createdAt) {
  const m = String(createdAt || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const period = (m[3] || '').toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

function hourLabel(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = ((h + 11) % 12) + 1;
  return `${display} ${period}`;
}

function parseOrderItem(item) {
  if (item == null) return null;
  const name = typeof item === 'string' ? item : (item.name || item.product_name || item.productName || '');
  let qty = typeof item === 'object' ? parseFloat(item.quantity ?? item.qty ?? 1) : 1;
  let price = typeof item === 'object' ? parseFloat(item.unit_price ?? item.unitPrice ?? item.price ?? 0) : 0;
  qty = Number.isFinite(qty) ? qty : 1;
  price = Number.isFinite(price) ? price : 0;
  const m = name.match(/^(\d+)\s*[x×]\s*(.*)$/i);
  if (m) {
    qty = qty * parseInt(m[1], 10);
    return { name: m[2].trim(), qty, price };
  }
  return { name, qty, price };
}

export function Dashboard({ ingredients, products, orders, onNavigate, onOpenNewProductModal }) {
  const [salesTimeframe, setSalesTimeframe] = useState('Today');
  const hasOrders = orders.length > 0;

  // ─── Best Sellers Today (backend-sourced) ───
  const [backendBestSellers, setBackendBestSellers] = useState(null);
  const [bestSellersLoading, setBestSellersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBestSellersLoading(true);
    api.getBestSellers()
      .then((data) => { if (!cancelled) setBackendBestSellers(data?.best_sellers || []); })
      .catch((err) => { console.warn('Failed to fetch best sellers:', err); if (!cancelled) setBackendBestSellers([]); })
      .finally(() => { if (!cancelled) setBestSellersLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ─── Stat cards ───
  const stats = useMemo(() => {
    const sales = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const count = orders.length;
    return {
      totalSalesToday: sales,
      weeklySales: sales,
      monthlySales: sales,
      avgOrderValue: count ? sales / count : 0,
      totalTransactions: count,
    };
  }, [orders]);

  // ─── Sales by Hour (backend-sourced) ───
  const [backendSalesByHour, setBackendSalesByHour] = useState(null);
  const [salesByHourLoading, setSalesByHourLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSalesByHourLoading(true);
    api.getSalesByHour()
      .then((data) => { if (!cancelled) setBackendSalesByHour(data?.sales_by_hour || []); })
      .catch((err) => { console.warn('Failed to fetch sales by hour:', err); if (!cancelled) setBackendSalesByHour([]); })
      .finally(() => { if (!cancelled) setSalesByHourLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ─── Sales by Hour ───
  const salesByHour = useMemo(() => {
    const buckets = [6, 8, 10, 12, 14, 16, 18, 20];
    const totals = {};

    // Prefer the backend aggregation when it has data for the day.
    if (backendSalesByHour && backendSalesByHour.length > 0) {
      backendSalesByHour.forEach((row) => {
        totals[Number(row.hour)] = (totals[Number(row.hour)] || 0) + (parseFloat(row.total_sales) || 0);
      });
    } else if (hasOrders) {
      orders.forEach(o => {
        const h = parseHour(o.createdAt);
        if (h == null) return;
        totals[h] = (totals[h] || 0) + (parseFloat(o.total) || 0);
      });
    }

    const vals = buckets.map(h => Math.round(totals[h] || 0));
    if (!hasOrders && !(backendSalesByHour && backendSalesByHour.length > 0)) return DEMO_SALES_BY_HOUR;
    if (vals.every(v => v === 0)) return DEMO_SALES_BY_HOUR;
    const max = Math.max(...vals, 1);
    return buckets.map((h, i) => ({
      time: hourLabel(h),
      val: vals[i],
      height: `${Math.max(12, Math.round((vals[i] / max) * 100))}%`,
    }));
  }, [orders, hasOrders, backendSalesByHour]);

  const peakIdx = salesByHour.reduce(
    (best, b, i) => (b.val > best.val ? { idx: i, val: b.val } : best),
    { idx: 0, val: -1 }
  ).idx;

  // ─── Payment Methods ───
  const payments = useMemo(() => {
    if (!hasOrders) return { card: 76, mobile: 15, cash: 9 };
    const counts = { card: 0, mobile: 0, cash: 0 };
    orders.forEach(o => {
      const m = String(o.paymentMethod || '').toLowerCase();
      if (['gcash', 'maya', 'mobile', 'gpay', 'google_pay', 'apple_pay', 'shopee', 'paypal'].some(k => m.includes(k))) counts.mobile++;
      else if (m.includes('cash')) counts.cash++;
      else counts.card++;
    });
    const total = orders.length || 1;
    let card = Math.round((counts.card / total) * 100);
    let mobile = Math.round((counts.mobile / total) * 100);
    let cash = 100 - card - mobile;
    if (cash < 0) { card += cash; cash = 0; }
    return { card, mobile, cash };
  }, [orders, hasOrders]);

  const digitalPct = payments.card + payments.mobile;

  // ─── Critical Inventory Alerts ───
  const inventoryAlerts = useMemo(() => {
    const low = ingredients.filter(ing => ing.status === 'Low Stock' || ing.stock <= ing.minStock);
    const out = ingredients.filter(ing => ing.status === 'Out of Stock' || ing.stock === 0);
    const expiring = ingredients.filter(ing => ing.expiringSoon);
    return {
      low,
      out,
      expiring,
      items: low.concat(out).sort((a, b) => a.stock - b.stock).slice(0, 3),
    };
  }, [ingredients]);

  // ─── Best Sellers Today ───
  const bestSellers = useMemo(() => {
    // Prefer the backend aggregation when it has data for the day.
    if (backendBestSellers && backendBestSellers.length > 0) {
      return backendBestSellers.slice(0, 4).map((item, i) => ({
        rank: String(i + 1),
        name: item.name,
        category: item.category || 'Item',
        sales: `${item.total_sold} sold`,
        revenue: `$${Number(item.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      }));
    }

    // Fallback: derive from already-loaded orders (or demo data).
    if (!hasOrders) return DEMO_BEST_SELLERS;
    const agg = new Map();
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const parsed = parseOrderItem(item);
        if (!parsed || !parsed.name) return;
        const product = products.find(p =>
          parsed.name.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(parsed.name.toLowerCase())
        );
        const unitPrice = parsed.price || (product ? product.price : 0);
        const cur = agg.get(parsed.name) || { qty: 0, revenue: 0, category: product ? product.category : 'Item' };
        cur.qty += parsed.qty;
        cur.revenue += parsed.qty * unitPrice;
        agg.set(parsed.name, cur);
      });
    });
    if (agg.size === 0) return DEMO_BEST_SELLERS;
    return [...agg.entries()]
      .map(([name, v]) => ({
        name,
        category: v.category,
        qty: v.qty,
        revenue: `$${v.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4)
      .map((item, i) => ({ ...item, rank: String(i + 1), sales: `${item.qty} sold` }));
  }, [orders, products, hasOrders, backendBestSellers]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Store Performance Overview
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Welcome back, Management Console ☕
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Here's what's happening at Brewtura downtown store today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenNewProductModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-bold shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <span>+</span> Add Product
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5E6D3] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/15 transition-all border border-amber-900/10 shadow-sm"
          >
            <span>📦</span> Purchase Stock
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFDF9] text-[#3C2A21] text-xs font-bold hover:bg-amber-900/5 transition-all border border-amber-900/20 shadow-sm"
          >
            <span>📈</span> View Reports
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Sales */}
        <button
          type="button"
          onClick={() => onNavigate('reports', 'sales')}
          className="w-full text-left glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Today's Sales</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">+14.2%</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">${stats.totalSalesToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">{stats.totalTransactions} Completed Orders</p>
          <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 group-hover:scale-110 transition-transform">💵</div>
        </button>

        {/* Weekly Sales */}
        <button
          type="button"
          onClick={() => onNavigate('reports', 'sales')}
          className="w-full text-left glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Weekly Sales</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">+8.5%</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">${stats.weeklySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">Last 7 Days total</p>
          <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 group-hover:scale-110 transition-transform">📅</div>
        </button>

        {/* Monthly Sales */}
        <button
          type="button"
          onClick={() => onNavigate('reports', 'sales')}
          className="w-full text-left glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Monthly Sales</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[10px]">On Target</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">${stats.monthlySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">July 2026 Revenue</p>
          <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 group-hover:scale-110 transition-transform">🏆</div>
        </button>

        {/* Avg Order Value */}
        <button
          type="button"
          onClick={() => onNavigate('reports', 'sales')}
          className="w-full text-left glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Avg Order Value</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">+$1.20</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">${stats.avgOrderValue.toFixed(2)}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">Per Ticket Average</p>
          <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 group-hover:scale-110 transition-transform">🧾</div>
        </button>

        {/* Total Transactions */}
        <button
          type="button"
          onClick={() => onNavigate('reports', 'sales')}
          className="w-full text-left glass-card p-5 rounded-2xl border border-white/60 relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-amber-900/60 font-bold mb-2">
            <span>Total Transactions</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">Live</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-[#3C2A21]">{stats.totalTransactions}</p>
          <p className="text-[11px] text-amber-900/50 mt-1 font-medium">98.2% Cashier Speed</p>
          <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 group-hover:scale-110 transition-transform">⚡</div>
        </button>
      </div>

      {/* Main Charts & Revenue Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (Simulated Visual Bar Chart) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Sales by Hour</h3>
                  <p className="text-xs text-amber-900/60 font-medium">Real-time revenue tracking for today</p>
                </div>
                <div className="flex items-center gap-3">
                  {salesByHourLoading ? (
                    <span className="flex items-center gap-1.5 text-[10px] text-amber-900/50 font-semibold">
                      <span className="w-3 h-3 rounded-full border-2 border-amber-900/20 border-t-amber-900 animate-spin inline-block" />
                      Syncing...
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-900/50 font-semibold">Live</span>
                  )}
                  <div className="flex bg-amber-900/10 p-1 rounded-xl">
                    {['Hourly', 'Daily'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setSalesTimeframe(tf)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          salesTimeframe === tf ? 'bg-[#3C2A21] text-amber-100 shadow' : 'text-amber-900/70'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            {/* Custom Bar Graph Visualization */}
            <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-amber-900/10">
              {salesByHour.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-amber-900/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${bar.val}
                  </div>
                  <div
                    style={{ height: bar.height }}
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      i === peakIdx ? 'bg-gradient-to-t from-[#693F27] to-[#C08552] shadow-md shadow-amber-900/30' : 'bg-amber-900/20 group-hover:bg-[#3C2A21]'
                    }`}
                  />
                  <span className="text-[11px] font-semibold text-amber-900/60">{bar.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-amber-900/70 pt-4 font-semibold">
            <span>Peak Hours: <strong className="text-[#3C2A21]">{salesByHour[peakIdx]?.time}</strong></span>
            <span>Est. Today Target: <strong className="text-emerald-700">$3,000.00</strong></span>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="glass-card p-6 rounded-3xl border border-white/60 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21] mb-1">Payment Methods</h3>
            <p className="text-xs text-amber-900/60 font-medium mb-6">Preferred customer checkout choices</p>

            {/* Visual Donut representation — animates filling to digital % on mount */}
            <div className="flex justify-center my-4">
              <div
                className="animate-donut-fill relative w-36 h-36 rounded-full shadow-inner"
                style={{
                  '--donut-p': 100,
                  background: `conic-gradient(#3C2A21 0 calc(var(--donut-p) * ${(payments.card / 100).toFixed(3)}%), #C08552 calc(var(--donut-p) * ${(payments.card / 100).toFixed(3)}%) calc(var(--donut-p) * ${(digitalPct / 100).toFixed(3)}%), #EAD9C4 calc(var(--donut-p) * ${(digitalPct / 100).toFixed(3)}%) calc(var(--donut-p) * 1%))`,
                }}
              >
                <div className="absolute inset-2 rounded-full bg-[#FFFDF9] flex items-center justify-center shadow-inner">
                  <div className="text-center animate-scaleIn">
                    <span className="font-heading font-extrabold text-xl text-[#3C2A21]">{digitalPct}%</span>
                    <p className="text-[10px] text-amber-900/60 font-bold uppercase">Digital</p>
                  </div>
                </div>
              </div>
            </div>

            {/* List breakdown */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-900/5 font-semibold">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3C2A21]"/> Credit/Debit Card</span>
                <span>{payments.card}%</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-900/5 font-semibold">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#C08552]"/> Mobile Pay (GCash/Maya)</span>
                <span>{payments.mobile}%</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-900/5 font-semibold">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EAD9C4]"/> Cash</span>
                <span>{payments.cash}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Alerts & Best Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Inventory Alerts */}
        <div className="glass-card p-6 rounded-3xl border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Critical Inventory Alerts</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-xs font-bold">
              Action Required
            </span>
          </div>

          <div className="space-y-3">
            {inventoryAlerts.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFDF9]/80 border border-amber-900/10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                    item.stock === 0 ? 'bg-red-500/10 text-red-700 border border-red-500/20' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                  }`}>
                    {item.stock === 0 ? '🚫' : '📦'}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#3C2A21]">{item.name}</h4>
                    <p className="text-[11px] text-amber-900/60 font-medium">Threshold: {item.minStock} {item.unit}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-extrabold rounded-lg inline-block ${
                    item.stock === 0 ? 'bg-red-500/15 text-red-700' : 'bg-amber-500/15 text-amber-900'
                  }`}>
                    {item.stock} {item.unit} Remaining
                  </span>
                  <button
                    onClick={() => onNavigate('inventory')}
                    className="block text-[11px] text-[#C08552] font-bold mt-1 hover:underline ml-auto"
                  >
                    Restock Now →
                  </button>
                </div>
              </div>
            ))}

            {inventoryAlerts.expiring.length > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <span>⏳</span>
                  <span>{inventoryAlerts.expiring.length} Bakery / Fresh Ingredients Expiring Soon</span>
                </div>
                <button
                  onClick={() => onNavigate('inventory')}
                  className="text-xs font-bold text-[#693F27] hover:underline"
                >
                  Review
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Best Sellers */}
        <div className="glass-card p-6 rounded-3xl border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Best Sellers Today</h3>
            </div>
            {bestSellersLoading ? (
              <span className="flex items-center gap-1.5 text-[10px] text-amber-900/50 font-semibold">
                <span className="w-3 h-3 rounded-full border-2 border-amber-900/20 border-t-amber-900 animate-spin inline-block" />
                Syncing...
              </span>
            ) : (
              <span className="text-xs text-amber-900/60 font-semibold">Top Ranked</span>
            )}
          </div>

          <div className="space-y-3">
            {bestSellers.map((item) => (
              <div key={item.rank} className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFDF9]/60 border border-amber-900/5">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                    item.rank === '1' ? 'bg-[#3C2A21] text-amber-200' : 'bg-amber-900/10 text-amber-900'
                  }`}>
                    #{item.rank}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-[#3C2A21]">{item.name}</h4>
                    <span className="text-[10px] font-semibold text-amber-900/50 uppercase">{item.category}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-xs text-[#3C2A21]">{item.revenue}</span>
                  <p className="text-[10px] text-emerald-700 font-bold">{item.sales}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
