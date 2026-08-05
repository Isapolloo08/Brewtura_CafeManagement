import React, { useState } from 'react';
import { ModalPortal } from './ModalPortal';
import { ConfirmModal } from './ConfirmModal';
import { Icons } from './Icons';
import api from '../services/api.js';

export function IngredientsPage({ ingredients, can, onAddStockMovement, onAddIngredient, onDeleteIngredient }) {
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIng, setSelectedIng] = useState(null);
  const [previewIng, setPreviewIng] = useState(null);
  const [deletingIng, setDeletingIng] = useState(null);
  const [adjType, setAdjType] = useState('Stock In');
  const [adjQty, setAdjQty] = useState(10);
  const [adjReason, setAdjReason] = useState('Fresh shipment received');
  const [newIng, setNewIng] = useState({ name: '', category: 'General', unit: 'kg', current_stock: 0, reorder_threshold: 10, unit_cost: 0 });

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedIng) return;
    onAddStockMovement({
      ingredientId: selectedIng.id,
      ingredientName: selectedIng.name,
      type: adjType,
      quantity: `${adjType === 'Stock Out' || adjType === 'Spoilage' || adjType === 'Waste' ? '-' : '+'}${adjQty} ${selectedIng.unit}`,
      reason: adjReason,
      user: 'Marco V. (Manager)'
    });
    setShowModal(false);
  };

  const handleDelete = async (ing) => {
    try {
      await api.deleteIngredient(ing.id);
    } catch (err) {
      console.warn('API deleteIngredient error, removing locally:', err);
    }
    onDeleteIngredient(ing.id);
    if (previewIng && previewIng.id === ing.id) setPreviewIng(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Stock Room
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Ingredients & Stock</h2>
          <p className="text-xs text-amber-900/70 font-medium">{ingredients.length} tracked ingredients</p>
        </div>
        {can('ingredients', 'add') && (
          <button onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5">
            + Add Ingredient
          </button>
        )}
      </div>

      <div className="glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 pr-4">Item Name</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Current Stock</th>
                <th className="py-3 pr-4">Min / Max</th>
                <th className="py-3 pr-4">Unit Cost</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10 text-xs font-semibold">
              {ingredients.map((ing) => (
                <tr key={ing.id} className="hover:bg-amber-900/5 transition-colors">
                  <td className="py-3.5 pr-4">
                    <p className="text-[#3C2A21] font-bold">{ing.name}</p>
                    {ing.expiringSoon && (
                      <span className="text-[10px] text-amber-800 font-extrabold bg-amber-500/15 px-1.5 rounded-md">⚡ Expiring Soon</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-amber-900/65">{ing.category}</td>
                  <td className="py-3.5 pr-4 font-extrabold text-[#3C2A21]">
                    {ing.stock} <span className="text-[10px] text-amber-900/55 font-normal">{ing.unit}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-amber-900/55 font-medium">{ing.minStock} / {ing.maxStock}</td>
                  <td className="py-3.5 pr-4 text-[#3C2A21]">${ing.costPerUnit.toFixed(2)}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${ing.status === 'In Stock'
                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                        : ing.status === 'Low Stock'
                          ? 'bg-amber-500/15 text-amber-900 border-amber-500/20'
                          : 'bg-red-500/10 text-red-800 border-red-500/20'
                      }`}>{ing.status}</span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setPreviewIng(ing)}
                        title="Preview ingredient details"
                        className="p-2 rounded-xl bg-amber-900/10 text-[#3C2A21] hover:bg-[#3C2A21] hover:text-amber-100 transition-all"
                      >
                        <Icons.Eye className="w-3.5 h-3.5" />
                      </button>
                      {can('stock_movements', 'add') && (
                        <button
                          onClick={() => { setSelectedIng(ing); setShowModal(true); }}
                          className="px-3 py-1.5 rounded-xl bg-amber-900/10 text-[#3C2A21] text-[11px] font-bold hover:bg-[#3C2A21] hover:text-amber-100 transition-all"
                        >
                          Adjust
                        </button>
                      )}
                      {can('ingredients', 'delete') && (
                        <button
                          onClick={() => setDeletingIng(ing)}
                          title="Delete ingredient"
                          className="p-2 rounded-xl bg-red-500/10 text-red-700 hover:bg-red-500/20 transition-all"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn">
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Add New Ingredient</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await api.createIngredient({
                  name: newIng.name,
                  unit: newIng.unit,
                  current_stock: parseFloat(newIng.current_stock),
                  reorder_threshold: parseFloat(newIng.reorder_threshold),
                  unit_cost: parseFloat(newIng.unit_cost)
                });
                onAddIngredient({
                  id: String(res.id),
                  name: res.name,
                  category: newIng.category,
                  stock: parseFloat(res.current_stock),
                  unit: res.unit,
                  minStock: parseFloat(res.reorder_threshold),
                  maxStock: parseFloat(res.reorder_threshold) * 10,
                  costPerUnit: parseFloat(res.unit_cost),
                  status: parseFloat(res.current_stock) <= 0
                    ? 'Out of Stock'
                    : parseFloat(res.current_stock) <= parseFloat(res.reorder_threshold)
                      ? 'Low Stock'
                      : 'In Stock'
                });
              } catch (err) {
                console.warn('API createIngredient error, fallback to local:', err);
                onAddIngredient({
                  id: `ing-${Date.now()}`,
                  name: newIng.name,
                  category: newIng.category,
                  stock: parseFloat(newIng.current_stock),
                  unit: newIng.unit,
                  minStock: parseFloat(newIng.reorder_threshold),
                  maxStock: parseFloat(newIng.reorder_threshold) * 10,
                  costPerUnit: parseFloat(newIng.unit_cost),
                  status: parseFloat(newIng.current_stock) <= 0
                    ? 'Out of Stock'
                    : parseFloat(newIng.current_stock) <= parseFloat(newIng.reorder_threshold)
                      ? 'Low Stock'
                      : 'In Stock'
                });
              }
              setShowAddModal(false);
              setNewIng({ name: '', category: 'General', unit: 'kg', current_stock: 0, reorder_threshold: 10, unit_cost: 0 });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Name</label>
                  <input type="text" required value={newIng.name}
                    onChange={(e) => setNewIng({ ...newIng, name: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]" placeholder="e.g. Vanilla Extract" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Category</label>
                  <input type="text" required value={newIng.category}
                    onChange={(e) => setNewIng({ ...newIng, category: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]" placeholder="e.g. Syrups" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Unit</label>
                  <select value={newIng.unit}
                    onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]">
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                    <option value="units">units</option>
                    <option value="Bottles">Bottles</option>
                    <option value="g">g</option>
                    <option value="mL">mL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Initial Stock</label>
                  <input type="number" step="0.1" required value={newIng.current_stock}
                    onChange={(e) => setNewIng({ ...newIng, current_stock: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Reorder At</label>
                  <input type="number" step="0.1" required value={newIng.reorder_threshold}
                    onChange={(e) => setNewIng({ ...newIng, reorder_threshold: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Unit Cost ($)</label>
                  <input type="number" step="0.01" required value={newIng.unit_cost}
                    onChange={(e) => setNewIng({ ...newIng, unit_cost: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowAddModal(false); setNewIng({ name: '', category: 'General', unit: 'kg', current_stock: 0, reorder_threshold: 10, unit_cost: 0 }); }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110">Add Ingredient</button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {previewIng && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">{previewIng.name}</h3>
                <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border bg-amber-900/10 text-[#693F27] border-amber-900/10">
                  {previewIng.category}
                </span>
              </div>
              <button onClick={() => setPreviewIng(null)} className="p-2 rounded-xl bg-amber-900/10 text-[#3C2A21] hover:bg-amber-900/20 transition-colors">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-amber-900/5 border border-amber-900/10 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50 mb-1">Current Stock</p>
                <p className="text-lg font-extrabold text-[#3C2A21]">{previewIng.stock} <span className="text-[11px] font-medium text-amber-900/55">{previewIng.unit}</span></p>
              </div>
              <div className="rounded-2xl bg-amber-900/5 border border-amber-900/10 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50 mb-1">Unit Cost</p>
                <p className="text-lg font-extrabold text-[#3C2A21]">${previewIng.costPerUnit.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-amber-900/5 border border-amber-900/10 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50 mb-1">Min / Max</p>
                <p className="text-lg font-extrabold text-[#3C2A21]">{previewIng.minStock} <span className="text-[11px] font-medium text-amber-900/55">/ {previewIng.maxStock} {previewIng.unit}</span></p>
              </div>
              <div className="rounded-2xl bg-amber-900/5 border border-amber-900/10 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50 mb-1">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${previewIng.status === 'In Stock'
                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                    : previewIng.status === 'Low Stock'
                      ? 'bg-amber-500/15 text-amber-900 border-amber-500/20'
                      : 'bg-red-500/10 text-red-800 border-red-500/20'
                  }`}>{previewIng.status}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {can('stock_movements', 'add') && (
                <button
                  onClick={() => { setSelectedIng(previewIng); setShowModal(true); setPreviewIng(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 transition-all"
                >
                  Adjust Stock
                </button>
              )}
              {can('ingredients', 'delete') && (
                <button
                  onClick={() => setDeletingIng(previewIng)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Icons.Trash className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <button
                onClick={() => setPreviewIng(null)}
                className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showModal && selectedIng && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn">
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">
              Stock Movement: {selectedIng.name}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Movement Type</label>
                <select value={adjType} onChange={(e) => setAdjType(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]">
                  <option value="Stock In">Stock In (+ Receiving)</option>
                  <option value="Stock Out">Stock Out (- Transfer)</option>
                  <option value="Waste">Waste (- Damage)</option>
                  <option value="Spoilage">Spoilage (- Expired)</option>
                  <option value="Manual Adjustment">Manual Audit Correction</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Quantity ({selectedIng.unit})</label>
                <input type="number" step="0.1" required value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Reason / Notes</label>
                <input type="text" required value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input text-[#3C2A21]"
                  placeholder="e.g. Delivery from Highland Roasters" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110">Save Movement</button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      <ConfirmModal
        isOpen={!!deletingIng}
        onClose={() => setDeletingIng(null)}
        onConfirm={() => handleDelete(deletingIng)}
        title="Delete Ingredient"
        message={`Are you sure you want to delete ${deletingIng?.name || 'this ingredient'}? It will be hidden from stock and can no longer be used in new recipes.`}
        confirmLabel="Delete Ingredient"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
