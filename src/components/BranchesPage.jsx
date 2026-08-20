import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { ConfirmModal } from './ConfirmModal';

function MultiSelectDropdown({ options, selected, onChange, placeholder, emptyNote, single = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    if (single) {
      onChange(selected === id ? '' : id);
      setOpen(false);
    } else {
      onChange(
        selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
      );
    }
  };

  const matches = (o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(o.name || '').toLowerCase().includes(q) ||
      String(o.employee_id || '').toLowerCase().includes(q) ||
      String(o.email || '').toLowerCase().includes(q)
    );
  };

  const filtered = options.filter(matches);

  const display = options.filter((o) =>
    single ? selected === String(o.id) : selected.includes(String(o.id))
  );
  const label = display.length === 0
    ? placeholder
    : display.map((o) => o.name).join(', ');

  const isChecked = (o) =>
    single ? selected === String(o.id) : selected.includes(String(o.id));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21] text-left"
      >
        <span className="truncate">{label}</span>
        <Icons.ChevronDown className={`w-3.5 h-3.5 shrink-0 text-amber-900/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-hidden rounded-xl glass-card border border-white/60 bg-white shadow-lg">
          <div className="p-1.5 border-b border-amber-900/10">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-900/5">
              <Icons.Search className="w-3.5 h-3.5 shrink-0 text-amber-900/50" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent outline-none text-xs font-semibold text-[#3C2A21] placeholder:text-amber-900/40"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-auto p-1.5">
            {options.length === 0 ? (
              <p className="px-2 py-1.5 text-[10px] font-medium text-amber-900/50">{emptyNote}</p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-[10px] font-medium text-amber-900/50">No matches found.</p>
            ) : (
              filtered.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-amber-900/5 text-[11px] font-semibold text-[#3C2A21]"
                >
                  <input
                    type={single ? 'radio' : 'checkbox'}
                    name="dd"
                    checked={isChecked(o)}
                    onChange={() => toggle(String(o.id))}
                    className="accent-[#3C2A21] w-3.5 h-3.5"
                  />
                  {o.name} <span className="text-[10px] text-amber-900/50 font-medium">({o.employee_id || o.email || ''})</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BranchesPage({ can }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formIsMain, setFormIsMain] = useState(false);
  const [formManagerId, setFormManagerId] = useState('');
  const [formCashierIds, setFormCashierIds] = useState([]);
  const [formInventoryIds, setFormInventoryIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [staff, setStaff] = useState([]);

  const [deletingBranch, setDeletingBranch] = useState(null);
  const [hardDeletingBranch, setHardDeletingBranch] = useState(null);
  const [mainConfirm, setMainConfirm] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await api.listBranches();
      setBranches(Array.isArray(res) ? res : []);
      setError('');
    } catch (err) {
      console.warn('Error loading branches:', err);
      setError('Failed to load branches from server.');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.getUsers();
      setStaff(Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn('Error loading staff:', err);
    }
  };

  useEffect(() => {
    loadBranches();
    loadStaff();
  }, []);

  const managers = staff.filter((u) => u.role === 'manager');
  const cashiers = staff.filter((u) => u.role === 'cashier');
  const inventoryStaff = staff.filter((u) => u.role === 'stock_clerk');

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const openAdd = () => {
    setEditingBranch(null);
    setFormName('');
    setFormAddress('');
    setFormIsMain(!branches.some((b) => b.is_main));
    setFormManagerId('');
    setFormCashierIds([]);
    setFormInventoryIds([]);
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setFormName(branch.name || '');
    setFormAddress(branch.address || '');
    setFormIsMain(!!branch.is_main);
    const inCharge = staff.find((u) => u.name === branch.manager_name);
    setFormManagerId(inCharge ? String(inCharge.id) : '');
    setFormCashierIds(
      (branch.cashiers || []).map((n) => {
        const u = staff.find((s) => s.name === n);
        return u ? String(u.id) : '';
      }).filter(Boolean)
    );
    setFormInventoryIds(
      (branch.inventory_staff || []).map((n) => {
        const u = staff.find((s) => s.name === n);
        return u ? String(u.id) : '';
      }).filter(Boolean)
    );
    setModalOpen(true);
  };

  const performSave = async () => {
    setSaving(true);
    const payload = {
      name: formName.trim(),
      address: formAddress,
      is_main: formIsMain,
      manager_id: formManagerId ? Number(formManagerId) : null,
      cashier_ids: formCashierIds.map(Number),
      inventory_ids: formInventoryIds.map(Number),
    };
    try {
      if (editingBranch) {
        await api.updateBranch(editingBranch.id, payload);
        showMsg(`Branch "${formName.trim()}" updated successfully!`);
      } else {
        await api.createBranch(payload);
        showMsg(`Branch "${formName.trim()}" created successfully!`);
      }
      setModalOpen(false);
      loadBranches();
    } catch (err) {
      showMsg(err.message || 'Failed to save branch.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const currentMain = branches.find((b) => b.is_main);
    const transferringMain = editingBranch && formIsMain && !editingBranch.is_main && currentMain;
    if (transferringMain) {
      setMainConfirm({
        currentMainName: currentMain.name,
        branchName: formName.trim(),
        onConfirm: performSave,
      });
      return;
    }
    performSave();
  };

  const handleDelete = async () => {
    if (!deletingBranch) return;
    try {
      await api.deleteBranch(deletingBranch.id);
      showMsg(`Branch "${deletingBranch.name}" deleted.`);
      setDeletingBranch(null);
      loadBranches();
    } catch (err) {
      showMsg(err.message || 'Failed to delete branch.', 'error');
      setDeletingBranch(null);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeletingBranch) return;
    try {
      const res = await api.hardDeleteBranch(hardDeletingBranch.id);
      showMsg(res.message || `Branch "${hardDeletingBranch.name}" permanently deleted.`);
      setHardDeletingBranch(null);
      loadBranches();
    } catch (err) {
      showMsg(err.message || 'Failed to permanently delete branch.', 'error');
      setHardDeletingBranch(null);
    }
  };

  const handleToggle = async (branch) => {
    try {
      await api.updateBranch(branch.id, { is_active: !branch.is_active });
      loadBranches();
    } catch (err) {
      showMsg(err.message || 'Failed to update branch status.', 'error');
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Branches</h3>
          <p className="text-[10px] text-[#3C2A21]/40 font-medium">
            Manage store locations used across shifts, users, and reports
          </p>
        </div>
        {can('branches', 'add') && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-md hover:brightness-110 transition-all"
          >
            <Icons.Plus className="w-3.5 h-3.5" /> Add Branch
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-extrabold animate-slideDown ${
          msg.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900'
            : 'bg-red-500/10 border border-red-500/20 text-red-900'
        }`}>
          <Icons.Bell className="w-3.5 h-3.5 shrink-0" />
          {msg.text}
        </div>
      )}

      {loading ? (
        <p className="p-6 text-center text-xs font-bold text-amber-900/50">Loading branches...</p>
      ) : error ? (
        <p className="p-6 text-center text-xs font-bold text-red-700">{error}</p>
      ) : branches.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 border border-white/60 text-center">
          <p className="text-xs font-bold text-amber-900/50">No branches yet. Click "Add Branch" to create your first location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`glass-card rounded-2xl border p-5 transition-all ${
                branch.is_active ? 'border-white/60' : 'border-amber-900/10 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h4 className="font-heading font-extrabold text-sm text-[#3C2A21] truncate">{branch.name}</h4>
                  <p className="text-[11px] text-amber-900/50 font-medium truncate">{branch.address || 'No address'}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                  {branch.is_main && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-[10px] font-extrabold whitespace-nowrap shadow-sm">
                      <Icons.Star className="w-3 h-3" /> Main
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap ${
                    branch.is_active ? 'bg-emerald-500/10 text-emerald-800' : 'bg-red-500/10 text-red-700'
                  }`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-amber-900/10 space-y-1.5 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5 text-amber-900/60">
                  <Icons.IdCard className="w-3.5 h-3.5 text-[#693F27]" />
                  <span>In charge:</span>
                  <span className="font-extrabold text-[#3C2A21] truncate">{branch.manager_name || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-900/60">
                  <Icons.Users className="w-3.5 h-3.5 text-[#693F27]" />
                  <span>Cashier(s):</span>
                  <span className="font-extrabold text-[#3C2A21] truncate">
                    {(branch.cashiers && branch.cashiers.length) ? branch.cashiers.join(', ') : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-900/60">
                  <Icons.Clipboard className="w-3.5 h-3.5 text-[#693F27]" />
                  <span>Inventory staff:</span>
                  <span className="font-extrabold text-[#3C2A21] truncate">
                    {(branch.inventory_staff && branch.inventory_staff.length) ? branch.inventory_staff.join(', ') : '—'}
                  </span>
                </div>
                <div className="text-amber-900/60">
                  <span className="font-extrabold text-[#693F27]">{branch.staff_count ?? 0}</span> staff assigned
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {can('branches', 'edit') && (
                  <button
                    type="button"
                    onClick={() => openEdit(branch)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-900/10 text-[#3C2A21] text-[11px] font-bold hover:bg-amber-900/15 transition-colors"
                  >
                    <Icons.Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {can('branches', 'assign') && (
                  <button
                    type="button"
                    onClick={() => openEdit(branch)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-900/10 text-[#3C2A21] text-[11px] font-bold hover:bg-amber-900/15 transition-colors"
                  >
                    <Icons.Users className="w-3.5 h-3.5" /> Staff
                  </button>
                )}
                {can('branches', 'edit') && (
                  <button
                    type="button"
                    onClick={() => handleToggle(branch)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-900/10 text-[#3C2A21] text-[11px] font-bold hover:bg-amber-900/15 transition-colors"
                  >
                    <Icons.Shuffle className="w-3.5 h-3.5" /> {branch.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                {can('branches', 'delete') && (
                  <button
                    type="button"
                    onClick={() => setDeletingBranch(branch)}
                    title="Delete (archive)"
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-red-500/10 text-red-700 text-[11px] font-bold hover:bg-red-500/20 transition-colors"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                )}
                {can('branches', 'delete') && (
                  <button
                    type="button"
                    onClick={() => setHardDeletingBranch(branch)}
                    title="Hard delete (permanent)"
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-red-600/15 text-red-800 text-[11px] font-bold hover:bg-red-600/25 transition-colors"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" /> Hard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60">
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                  {can('branches', 'edit') && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Branch Name</label>
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                          placeholder="e.g. Downtown Branch"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Address</label>
                        <textarea
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21] resize-none"
                          placeholder="e.g. 456 Market St. Metro"
                        />
                      </div>
                    </>
                  )}
                  {(editingBranch ? true : !branches.some((b) => b.is_main)) && (
                    <div className="p-3 rounded-xl bg-[#C08552]/10 border border-[#C08552]/20">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsMain}
                          onChange={(e) => setFormIsMain(e.target.checked)}
                          disabled={editingBranch && editingBranch.is_main}
                          className="mt-0.5 rounded-md text-[#C08552] focus:ring-[#C08552] focus:ring-offset-0 w-4 h-4 border-[#C08552]/40"
                        />
                        <div>
                          <span className="font-extrabold text-xs text-[#3C2A21]">Set as Main Branch</span>
                          <p className="text-[10px] text-[#3C2A21]/50 font-medium mt-0.5">
                            {editingBranch && editingBranch.is_main
                              ? 'This is currently the main branch.'
                              : editingBranch
                                ? 'The current main branch will be replaced by this branch.'
                                : 'No main branch exists yet. This branch will become the main branch.'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                <div>
                  <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Person In Charge (Manager)</label>
                  <MultiSelectDropdown
                    options={managers}
                    selected={formManagerId}
                    onChange={setFormManagerId}
                    placeholder="Select a manager..."
                    emptyNote="No manager accounts available. Add a manager in User Management first."
                    single
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Cashier(s)</label>
                  <MultiSelectDropdown
                    options={cashiers}
                    selected={formCashierIds}
                    onChange={setFormCashierIds}
                    placeholder="Select cashier(s)..."
                    emptyNote="No cashier accounts available. Add cashiers in User Management first."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Inventory Staff</label>
                  <MultiSelectDropdown
                    options={inventoryStaff}
                    selected={formInventoryIds}
                    onChange={setFormInventoryIds}
                    placeholder="Select inventory staff..."
                    emptyNote="No stock clerk accounts available. Add a stock clerk in User Management first."
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <ConfirmModal
        isOpen={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        onConfirm={handleDelete}
        title="Delete Branch"
        message={`Are you sure you want to delete "${deletingBranch?.name || 'this branch'}"? This cannot be undone.`}
        confirmLabel="Delete Branch"
        cancelLabel="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!hardDeletingBranch}
        onClose={() => setHardDeletingBranch(null)}
        onConfirm={handleHardDelete}
        title="Permanently Delete Branch"
        message={`This will PERMANENTLY delete "${hardDeletingBranch?.name || 'this branch'}" and ALL of its historical records — orders, shifts, cash movements, and payments. This CANNOT be undone. Continue?`}
        confirmLabel="Delete Forever"
        cancelLabel="Cancel"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!mainConfirm}
        onClose={() => setMainConfirm(null)}
        onConfirm={() => mainConfirm?.onConfirm()}
        title="Change Main Branch"
        message={`"${mainConfirm?.branchName}" will become the main branch. The main status will be removed from "${mainConfirm?.currentMainName}" and transferred to this branch. Continue?`}
        confirmLabel="Yes, Set as Main"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
