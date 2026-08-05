import React, { useState } from 'react';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';

const ICON_OPTIONS = [
  { key: 'Coffee', label: 'Coffee', comp: Icons.CategoryCoffee },
  { key: 'CupSoda', label: 'Tea / Non-Coffee', comp: Icons.CategoryCupSoda },
  { key: 'Leaf', label: 'Tea', comp: Icons.CategoryLeaf },
  { key: 'Croissant', label: 'Pastries', comp: Icons.CategoryCroissant },
  { key: 'Cake', label: 'Desserts', comp: Icons.CategoryCake },
  { key: 'Cookie', label: 'Snacks', comp: Icons.CategoryCookie },
  { key: 'Beverages', label: 'Beverages', comp: Icons.CategoryCupSoda },
  { key: 'IceCream', label: 'Ice Cream', comp: Icons.CategoryCake },
  { key: 'Other', label: 'Other', comp: Icons.CategoryCookie },
];

export function EditCategoryModal({ isOpen, onClose, category, onUpdateCategory }) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || 'Coffee');
  const [description, setDescription] = useState(category?.description || '');

  if (!isOpen || !category) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateCategory({
      ...category,
      name: name.trim(),
      icon,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-6 border border-white/60 text-[#3C2A21]">
        <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
          <div>
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Edit Category</h3>
            <p className="text-xs text-amber-900/60 font-medium">Update category name, icon & description</p>
          </div>
          <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Category Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
              placeholder="e.g. Smoothies, Bakery, Seasonal"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-2">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((opt) => {
                const IconComp = opt.comp;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIcon(opt.key)}
                    className={`p-3 rounded-xl transition-all ${
                      icon === opt.key
                        ? 'bg-[#3C2A21] text-amber-100 ring-2 ring-[#C08552]'
                        : 'bg-amber-900/5 hover:bg-amber-900/10 text-[#693F27]'
                    }`}
                    title={opt.label}
                  >
                    <IconComp className="w-5 h-5 mx-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
              placeholder="Brief description of this category..."
            />
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-bold shadow-lg shadow-amber-950/20 hover:brightness-110 transition-all"
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
