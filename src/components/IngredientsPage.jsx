import React, { useMemo, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Icons } from './Icons';
import {
  PageHeader,
  StatCard,
  SectionCard,
  SearchInput,
  FilterTabs,
  EmptyState,
  TableHead,
  Pagination,
  CountPill,
  StatusPill,
  PrimaryButton,
  SubtleButton,
  IconButton,
  ModalShell,
  ModalActions,
  Field,
  inputClass,
  toneOf,
} from './PageKit';
import api from '../services/api.js';

const PAGE_SIZE = 25;
const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const money = (v) => `$${num(v).toFixed(2)}`;

const STATUS_TONE = { 'In Stock': 'emerald', 'Low Stock': 'amber', 'Out of Stock': 'red' };

const BLANK_ING = { name: '', category: 'General', unit: 'kg', current_stock: 0, reorder_threshold: 10, unit_cost: 0 };

function StockLevel({ ing }) {
  const max = num(ing.maxStock);
  const pct = max > 0 ? Math.min(100, (num(ing.stock) / max) * 100) : 0;
  const t = toneOf(STATUS_TONE[ing.status] || 'coffee');
  return (
    <div className="min-w-[7.5rem]">
      <p className="font-extrabold text-[#3C2A21] tabular-nums">
        {num(ing.stock)} <span className="text-[10px] text-amber-900/50 font-semibold">{ing.unit}</span>
      </p>
      <div className="mt-1.5 w-full h-1.5 rounded-full bg-amber-900/10 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${t.bar} animate-progress-in`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function IngredientsPage({ ingredients, can, onAddStockMovement, onAddIngredient, onDeleteIngredient }) {
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIng, setSelectedIng] = useState(null);
  const [previewIng, setPreviewIng] = useState(null);
  const [deletingIng, setDeletingIng] = useState(null);
  const [adjType, setAdjType] = useState('Stock In');
  const [adjQty, setAdjQty] = useState(10);
  const [adjReason, setAdjReason] = useState('Fresh shipment received');
  const [newIng, setNewIng] = useState(BLANK_ING);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const stats = useMemo(() => {
    const low = ingredients.filter((i) => i.status === 'Low Stock').length;
    const out = ingredients.filter((i) => i.status === 'Out of Stock').length;
    const value = ingredients.reduce((sum, i) => sum + num(i.stock) * num(i.costPerUnit), 0);
    return { low, out, value, healthy: ingredients.length - low - out };
  }, [ingredients]);

  const tabs = useMemo(
    () => [
      { id: 'all', label: 'All', count: ingredients.length },
      { id: 'In Stock', label: 'In Stock', count: stats.healthy },
      { id: 'Low Stock', label: 'Low Stock', count: stats.low },
      { id: 'Out of Stock', label: 'Out of Stock', count: stats.out },
    ],
    [ingredients.length, stats]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ingredients.filter((ing) => {
      if (statusFilter !== 'all' && ing.status !== statusFilter) return false;
      if (!q) return true;
      return [ing.name, ing.category, ing.unit].filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
    });
  }, [ingredients, statusFilter, search]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = (fn) => (val) => {
    setPage(1);
    fn(val);
  };

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

  const handleCreateIngredient = async (e) => {
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
    setNewIng(BLANK_ING);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        eyebrow="Stock Room"
        title="Ingredients & Stock"
        subtitle="Track raw materials, reorder points and inventory value in one place."
        icon={<Icons.Sprout className="w-5 h-5" />}
      >
        {(stats.low > 0 || stats.out > 0) && (
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/12 border border-amber-500/25 text-[11px] font-extrabold text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {stats.out > 0 ? `${stats.out} out of stock` : `${stats.low} need reorder`}
          </span>
        )}
        {can('ingredients', 'add') && (
          <PrimaryButton onClick={() => setShowAddModal(true)} className="!px-4 !py-2.5">
            <Icons.Plus className="w-4 h-4" /> Add Ingredient
          </PrimaryButton>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Icons.Package className="w-5 h-5" />}
          label="Tracked Items"
          value={ingredients.length.toLocaleString()}
          sub={`${stats.healthy} at healthy levels`}
          tone="coffee"
        />
        <StatCard
          icon={<Icons.Scale className="w-5 h-5" />}
          label="Inventory Value"
          value={money(stats.value)}
          sub="Stock × unit cost"
          tone="emerald"
        />
        <StatCard
          icon={<Icons.Bell className="w-5 h-5" />}
          label="Low Stock"
          value={stats.low.toLocaleString()}
          sub="At or below reorder point"
          tone="amber"
        />
        <StatCard
          icon={<Icons.Inventory className="w-5 h-5" />}
          label="Out of Stock"
          value={stats.out.toLocaleString()}
          sub="Blocking production"
          tone="red"
        />
      </div>

      <SectionCard
        icon={<Icons.Inventory className="w-4 h-4" />}
        title="Ingredient Inventory"
        hint="Stock levels shown against max capacity"
        bodyClassName="p-0"
        actions={
          <>
            <SearchInput
              value={search}
              onChange={resetPage(setSearch)}
              placeholder="Search ingredients..."
              className="w-52"
            />
            <CountPill tone={filtered.length === ingredients.length ? 'coffee' : 'amber'}>
              {filtered.length} shown
            </CountPill>
          </>
        }
      >
        <div className="px-6 pt-4 pb-3 border-b border-amber-900/[0.07]">
          <FilterTabs tabs={tabs} value={statusFilter} onChange={resetPage(setStatusFilter)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icons.Sprout className="w-6 h-6" />}
            title={ingredients.length === 0 ? 'No ingredients tracked yet' : 'No ingredients match your filters'}
            hint={
              ingredients.length === 0
                ? 'Add your first raw material to start tracking stock and recipe deductions.'
                : 'Try a different status or clear the search.'
            }
          >
            {ingredients.length === 0 && can('ingredients', 'add') && (
              <PrimaryButton onClick={() => setShowAddModal(true)}>
                <Icons.Plus className="w-4 h-4" /> Add Ingredient
              </PrimaryButton>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <TableHead
                  columns={[
                    { label: 'Item Name' },
                    { label: 'Category' },
                    { label: 'Stock Level' },
                    { label: 'Reorder At', align: 'right' },
                    { label: 'Unit Cost', align: 'right' },
                    { label: 'Value', align: 'right' },
                    { label: 'Status' },
                    { label: 'Actions', align: 'right' },
                  ]}
                />
                <tbody className="divide-y divide-amber-900/[0.07] text-xs font-semibold">
                  {paged.map((ing) => (
                    <tr key={ing.id} className="hover:bg-amber-900/[0.04] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 shrink-0 rounded-xl bg-amber-900/[0.07] border border-amber-900/10 flex items-center justify-center text-[#693F27]">
                            <Icons.Sprout className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[#3C2A21] font-bold truncate">{ing.name}</p>
                            {ing.expiringSoon && (
                              <span className="inline-block mt-0.5 text-[9px] text-amber-800 font-extrabold bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-md">
                                ⚡ Expiring Soon
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-900/[0.06] border border-amber-900/10 text-[10px] font-bold text-amber-900/65 whitespace-nowrap">
                          {ing.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StockLevel ing={ing} />
                      </td>
                      <td className="py-3 px-4 text-right text-amber-900/55 font-medium tabular-nums whitespace-nowrap">
                        {num(ing.minStock)} <span className="text-[10px]">{ing.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-[#3C2A21] tabular-nums">{money(ing.costPerUnit)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#693F27] tabular-nums">
                        {money(num(ing.stock) * num(ing.costPerUnit))}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={ing.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            icon={<Icons.Eye className="w-3.5 h-3.5" />}
                            label="Preview ingredient details"
                            onClick={() => setPreviewIng(ing)}
                          />
                          {can('stock_movements', 'add') && (
                            <button
                              type="button"
                              onClick={() => { setSelectedIng(ing); setShowModal(true); }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-900/[0.09] text-[#3C2A21] text-[10px] font-extrabold hover:bg-[#3C2A21] hover:text-amber-100 transition-all whitespace-nowrap"
                            >
                              Adjust
                            </button>
                          )}
                          {can('ingredients', 'delete') && (
                            <IconButton
                              icon={<Icons.Trash className="w-3.5 h-3.5" />}
                              label="Delete ingredient"
                              tone="danger"
                              onClick={() => setDeletingIng(ing)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </SectionCard>

      {showAddModal && (
        <ModalShell
          title="Add New Ingredient"
          subtitle="Register a raw material for stock tracking"
          icon={<Icons.Sprout className="w-4 h-4" />}
          onClose={() => { setShowAddModal(false); setNewIng(BLANK_ING); }}
        >
          <form onSubmit={handleCreateIngredient} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" className="col-span-2">
                <input type="text" required value={newIng.name}
                  onChange={(e) => setNewIng({ ...newIng, name: e.target.value })}
                  className={inputClass} placeholder="e.g. Vanilla Extract" autoFocus />
              </Field>
              <Field label="Category">
                <input type="text" required value={newIng.category}
                  onChange={(e) => setNewIng({ ...newIng, category: e.target.value })}
                  className={inputClass} placeholder="e.g. Syrups" />
              </Field>
              <Field label="Unit">
                <select value={newIng.unit}
                  onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })}
                  className={inputClass}>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="pcs">pcs</option>
                  <option value="units">units</option>
                  <option value="Bottles">Bottles</option>
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                </select>
              </Field>
              <Field label="Initial Stock">
                <input type="number" step="0.1" required value={newIng.current_stock}
                  onChange={(e) => setNewIng({ ...newIng, current_stock: e.target.value })}
                  className={inputClass} />
              </Field>
              <Field label="Reorder At" hint="Low-stock alerts trigger at this level.">
                <input type="number" step="0.1" required value={newIng.reorder_threshold}
                  onChange={(e) => setNewIng({ ...newIng, reorder_threshold: e.target.value })}
                  className={inputClass} />
              </Field>
              <Field label="Unit Cost ($)" className="col-span-2">
                <input type="number" step="0.01" required value={newIng.unit_cost}
                  onChange={(e) => setNewIng({ ...newIng, unit_cost: e.target.value })}
                  className={inputClass} />
              </Field>
            </div>
            <ModalActions
              onCancel={() => { setShowAddModal(false); setNewIng(BLANK_ING); }}
              submitLabel="Add Ingredient"
            />
          </form>
        </ModalShell>
      )}

      {previewIng && (
        <ModalShell
          title={previewIng.name}
          subtitle={`${previewIng.category || 'General'} · tracked in ${previewIng.unit}`}
          icon={<Icons.Package className="w-4 h-4" />}
          onClose={() => setPreviewIng(null)}
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-amber-900/10 bg-amber-900/[0.03] p-4">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-900/45">Current Stock</p>
                  <p className="font-heading font-extrabold text-2xl text-[#3C2A21] leading-tight">
                    {num(previewIng.stock)} <span className="text-xs font-semibold text-amber-900/50">{previewIng.unit}</span>
                  </p>
                </div>
                <StatusPill status={previewIng.status} />
              </div>
              <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${toneOf(STATUS_TONE[previewIng.status] || 'coffee').bar} animate-progress-in`}
                  style={{ width: `${num(previewIng.maxStock) > 0 ? Math.min(100, (num(previewIng.stock) / num(previewIng.maxStock)) * 100) : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-amber-900/40 mt-1.5 tabular-nums">
                <span>Reorder {num(previewIng.minStock)}{previewIng.unit}</span>
                <span>Max {num(previewIng.maxStock)}{previewIng.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Unit Cost', value: money(previewIng.costPerUnit) },
                { label: 'Stock Value', value: money(num(previewIng.stock) * num(previewIng.costPerUnit)) },
                { label: 'Reorder Point', value: `${num(previewIng.minStock)} ${previewIng.unit}` },
                { label: 'Max Capacity', value: `${num(previewIng.maxStock)} ${previewIng.unit}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-white/50 border border-amber-900/10 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-900/45 mb-1">{label}</p>
                  <p className="text-base font-extrabold text-[#3C2A21] tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {can('stock_movements', 'add') && (
                <PrimaryButton
                  type="button"
                  onClick={() => { setSelectedIng(previewIng); setShowModal(true); setPreviewIng(null); }}
                  className="flex-1 !py-2.5"
                >
                  <Icons.ArrowUpDown className="w-3.5 h-3.5" /> Adjust Stock
                </PrimaryButton>
              )}
              {can('ingredients', 'delete') && (
                <button
                  type="button"
                  onClick={() => setDeletingIng(previewIng)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Icons.Trash className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <SubtleButton type="button" onClick={() => setPreviewIng(null)} className="flex-1 !py-2.5">
                Close
              </SubtleButton>
            </div>
          </div>
        </ModalShell>
      )}

      {showModal && selectedIng && (
        <ModalShell
          title="Record Stock Movement"
          subtitle={`${selectedIng.name} · currently ${num(selectedIng.stock)} ${selectedIng.unit}`}
          icon={<Icons.ArrowUpDown className="w-4 h-4" />}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Movement Type">
              <select value={adjType} onChange={(e) => setAdjType(e.target.value)} className={inputClass}>
                <option value="Stock In">Stock In (+ Receiving)</option>
                <option value="Stock Out">Stock Out (- Transfer)</option>
                <option value="Waste">Waste (- Damage)</option>
                <option value="Spoilage">Spoilage (- Expired)</option>
                <option value="Manual Adjustment">Manual Audit Correction</option>
              </select>
            </Field>
            <Field label={`Quantity (${selectedIng.unit})`}>
              <input type="number" step="0.1" required value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Reason / Notes" hint="Shown in the audit trail alongside your name.">
              <input type="text" required value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)} className={inputClass}
                placeholder="e.g. Delivery from Highland Roasters" />
            </Field>
            <ModalActions onCancel={() => setShowModal(false)} submitLabel="Save Movement" />
          </form>
        </ModalShell>
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
