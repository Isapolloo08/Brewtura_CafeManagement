import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const isDrink = (category) => /coffee|tea|drink|beverage|soda|juice|matcha|milk|latte/i.test(category || '');

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BestSellersPage() {
  const [topProducts, setTopProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getDashboardStats()
      .then((data) => { if (!cancelled) setTopProducts(data.top_products_today || []); })
      .catch((err) => { console.warn('API error fetching best sellers:', err); if (!cancelled) setTopProducts([]); });
    return () => { cancelled = true; };
  }, []);

  const drinks = [];
  const food = [];
  (topProducts || []).forEach((p) => {
    const entry = {
      name: p.product_name,
      units: Number(p.total_sold) || 0,
      revenue: fmtMoney(p.total_revenue),
    };
    (isDrink(p.category_name) ? drinks : food).push(entry);
  });

  const renderList = (list, emptyMessage) => (
    <div className="space-y-3">
      {list.length ? (
        list.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[#FFFDF9]/60 border border-amber-900/10 text-xs">
            <div>
              <span className="font-bold text-[#3C2A21]">{item.name}</span>
              <p className="text-[10px] text-emerald-700 font-bold">{item.units} units sold</p>
            </div>
            <span className="font-extrabold text-[#3C2A21]">{item.revenue}</span>
          </div>
        ))
      ) : (
        <div className="p-6 rounded-xl bg-amber-900/5 border border-dashed border-amber-900/20 text-center">
          <p className="text-sm mb-1">🫙</p>
          <p className="text-xs font-bold text-amber-900/60">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
      <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-4">
        <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Most Ordered Drinks</h3>
        {renderList(drinks, 'No most ordered drinks yet')}
      </div>
      <div className="glass-card p-6 rounded-2xl border border-white/60 space-y-4">
        <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Most Ordered Food</h3>
        {renderList(food, 'No most ordered food yet')}
      </div>
    </div>
  );
}
