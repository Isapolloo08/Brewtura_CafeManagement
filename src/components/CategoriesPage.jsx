import React, { useState } from 'react';
import { AddCategoryModal } from './AddCategoryModal';
import { EditCategoryModal } from './EditCategoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Icons } from './Icons';
import api from '../services/api.js';

export function CategoriesPage({ categories, can, onAddCategory, onUpdateCategory, onDeleteCategory }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const iconMap = {
    Coffee: Icons.CategoryCoffee,
    CupSoda: Icons.CategoryCupSoda,
    Leaf: Icons.CategoryLeaf,
    Croissant: Icons.CategoryCroissant,
    Cake: Icons.CategoryCake,
    Cookie: Icons.CategoryCookie,
  };

  const handleAdd = async (newCat) => {
    try {
      const res = await api.createCategory({ name: newCat.name });
      onAddCategory({ id: String(res.id), name: res.name, count: 0, status: 'Active' });
    } catch (err) {
      console.warn('API error creating category:', err);
      onAddCategory(newCat);
    }
  };

  const handleUpdate = async (updatedCat) => {
    try {
      await api.updateCategory(updatedCat.id, { name: updatedCat.name });
      onUpdateCategory(updatedCat);
    } catch (err) {
      console.warn('API error updating category:', err);
      onUpdateCategory(updatedCat);
    }
  };

  const handleDelete = async (catId) => {
    try {
      await api.deleteCategory(catId);
      onDeleteCategory(catId);
    } catch (err) {
      console.warn('API error deleting category:', err);
      onDeleteCategory(catId);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Catalog Organization
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Categories
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Group your menu items into browsable categories.
          </p>
        </div>
        {can('menu', 'add') && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all"
          >
            + Add Category
          </button>
        )}
      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="glass-card rounded-3xl border border-white/60 p-6 flex flex-col hover:shadow-lg hover:shadow-amber-950/10 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#3C2A21]/5 flex items-center justify-center text-[#693F27] ring-1 ring-[#C08552]/20">
                {(() => {
                  const IconComp = iconMap[cat.icon];
                  return IconComp ? <IconComp className="w-5 h-5" /> : <Icons.CoffeeCup className="w-5 h-5" />;
                })()}
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold whitespace-nowrap">
                {cat.count} items
              </span>
            </div>
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">{cat.name}</h3>
            {cat.description && (
              <p className="text-xs text-amber-900/60 mt-2 font-medium leading-relaxed">{cat.description}</p>
            )}
            <div className="flex items-center gap-3 mt-auto pt-4">
              {can('menu', 'edit') && (
                <button
                  onClick={() => setEditingCategory(cat)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-900/60 hover:text-[#3C2A21] transition-colors"
                >
                  <Icons.Edit className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              {can('menu', 'delete') && (
                <button
                  onClick={() => setDeletingCategory(cat)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-600/60 hover:text-red-700 transition-colors"
                >
                  <Icons.Trash className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddCategoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaveCategory={handleAdd}
      />

      <EditCategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
        onUpdateCategory={handleUpdate}
      />

      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => handleDelete(deletingCategory.id)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
