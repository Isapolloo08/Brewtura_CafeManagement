import React, { useState } from 'react';
import { ModalPortal } from './ModalPortal';

export function EditCustomizationModal({ isOpen, onClose, customization, products, onUpdateProduct }) {
  const [name, setName] = useState(customization?.name || '');
  const [priceDelta, setPriceDelta] = useState(customization?.priceDelta ?? 0);

  if (!isOpen || !customization) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const product = products.find(p => p.id === customization.productId);
    if (!product) return;

    const updatedCustomizations = [...(product.customizations || [])];
    updatedCustomizations[customization._idx] = { ...updatedCustomizations[customization._idx], name: name.trim(), priceDelta: parseFloat(priceDelta) || 0 };

    onUpdateProduct({ ...product, customizations: updatedCustomizations });
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-6 border border-white/60 text-[#3C2A21]">
        <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
          <div>
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Edit Customization</h3>
            <p className="text-xs text-amber-900/60 font-medium">{customization.productName}</p>
          </div>
          <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Customization Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
              placeholder="e.g. Small (12oz)"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Price Delta ($)</label>
            <input
              type="number"
              step="0.01"
              value={priceDelta}
              onChange={(e) => setPriceDelta(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
              placeholder="0.00"
            />
            <p className="text-[10px] text-amber-900/40 font-medium mt-1">Base price customization = $0. Enter additional cost for upsized options.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
