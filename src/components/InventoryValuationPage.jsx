import React from 'react';

export function InventoryValuationPage({ ingredients }) {
  return (
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
  );
}
