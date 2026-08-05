import React, { useState } from 'react';
import { ModalPortal } from './ModalPortal';
import api from '../services/api.js';

export function SuppliersPage({ suppliers, can, onCreatePurchaseOrder, onAddSupplier }) {
  const [showPOModal, setShowPOModal] = useState(false);
  const [poSupplier, setPoSupplier] = useState(suppliers[0]?.name || '');
  const [poCost, setPoCost] = useState(150.00);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSup, setNewSup] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });

  const handleCreatePO = (e) => {
    e.preventDefault();
    onCreatePurchaseOrder({
      id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: poSupplier,
      date: new Date().toISOString().split('T')[0],
      items: 3,
      totalCost: parseFloat(poCost),
      status: 'Pending Approval',
      expectedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
    });
    setShowPOModal(false);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createSupplier({
        name: newSup.name,
        contact_person: newSup.contactPerson,
        phone: newSup.phone,
        email: newSup.email
      });
      onAddSupplier({
        id: String(res.id),
        name: res.name,
        contactPerson: res.contact_person,
        phone: res.phone,
        email: res.email,
        activeOrders: 0
      });
    } catch (err) {
      console.warn('API error creating supplier:', err);
      onAddSupplier({
        id: `sup-${Date.now()}`,
        ...newSup,
        activeOrders: 0,
      });
    }
    setNewSup({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Vendor Directory
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Suppliers</h2>
          <p className="text-xs text-amber-900/70 font-medium">{suppliers.length} verified partners</p>
        </div>
        {can('suppliers', 'add') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all"
          >
            + Add Supplier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {suppliers.map((sup) => (
          <div key={sup.id} className="glass-card rounded-3xl border border-white/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-900/10 flex items-center justify-center text-xl">🏭</div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[11px] font-bold">Verified</span>
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">{sup.name}</h3>
              <p className="text-xs text-amber-900/55 font-medium">{sup.contactPerson}</p>
            </div>
            <div className="space-y-1.5 text-xs text-amber-900/70 font-medium pt-3 border-t border-amber-900/10">
              <p>📞 {sup.phone}</p>
              <p>✉️ {sup.email}</p>
              <p>📍 {sup.address}</p>
            </div>
            {can('purchase_orders', 'add') && (
              <button
                onClick={() => { setPoSupplier(sup.name); setShowPOModal(true); }}
                className="w-full py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold hover:brightness-110 shadow-md"
              >
                Create Order
              </button>
            )}
          </div>
        ))}
      </div>

      {showPOModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn">
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">New Purchase Order</h3>
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Supplier</label>
                <input type="text" readOnly value={poSupplier}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Estimated Total Cost ($)</label>
                <input type="number" step="0.01" required value={poCost}
                  onChange={(e) => setPoCost(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowPOModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110">Issue Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {showAddModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn">
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Add New Supplier</h3>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Company Name</label>
                <input type="text" required value={newSup.name}
                  onChange={(e) => setNewSup(s => ({ ...s, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                  placeholder="e.g. Highland Coffee Beans Co." />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Contact Person</label>
                <input type="text" required value={newSup.contactPerson}
                  onChange={(e) => setNewSup(s => ({ ...s, contactPerson: e.target.value }))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                  placeholder="e.g. David Vance" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Phone</label>
                  <input type="text" required value={newSup.phone}
                    onChange={(e) => setNewSup(s => ({ ...s, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                    placeholder="+1 (555) 234-8890" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" required value={newSup.email}
                    onChange={(e) => setNewSup(s => ({ ...s, email: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                    placeholder="orders@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Address</label>
                <input type="text" required value={newSup.address}
                  onChange={(e) => setNewSup(s => ({ ...s, address: e.target.value }))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                  placeholder="e.g. 45 Roasters Way, Seattle WA" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110">Add Supplier</button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
