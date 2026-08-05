import React, { useState } from 'react';
import { Icons } from './Icons';
import { EditRecipeModal } from './EditRecipeModal';
import { ConfirmModal } from './ConfirmModal';
import api from '../services/api.js';

export function RecipesPage({ products, ingredients, can, onUpdateProduct }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const productsWithRecipe = products.filter(p => p.recipe && p.recipe.length > 0);
  const productsWithoutRecipe = products.filter(p => !p.recipe || p.recipe.length === 0);

  const handleDeleteRecipe = async (product) => {
    const productId = parseInt(product.id, 10);
    if (productId) {
      try {
        await api.updateProductRecipe(productId, []);
      } catch (err) {
        console.warn('Failed to delete recipe from database:', err);
      }
    }
    onUpdateProduct({ ...product, recipe: [] });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Ingredient BOM
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Recipes
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Bill of Materials — link ingredients to products for auto-inventory deduction.
          </p>
        </div>
      </div>

      {productsWithoutRecipe.length > 0 && (
        <div className="glass-card rounded-3xl border border-white/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-heading font-extrabold text-sm text-[#3C2A21]">Products Without Recipes</h4>
            <span className="text-[11px] font-bold text-amber-900/50">{productsWithoutRecipe.length} item(s)</span>
          </div>
          <p className="text-xs text-amber-900/50 font-medium mb-3">Click a product to create its recipe.</p>
          <div className="flex flex-wrap gap-2">
            {productsWithoutRecipe.map((product) => (
              can('menu', 'edit') ? (
                <button
                  key={product.id}
                  onClick={() => setEditingProduct(product)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-900/5 text-amber-900/60 border border-amber-900/10 hover:bg-[#3C2A21] hover:text-amber-100 transition-colors"
                >
                  + {product.name}
                </button>
              ) : (
                <span
                  key={product.id}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-900/5 text-amber-900/60 border border-amber-900/10"
                >
                  {product.name}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      {productsWithRecipe.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/60 p-12 text-center">
          <p className="text-amber-900/50 text-sm font-semibold">No recipes configured. Edit a product to attach ingredients.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {productsWithRecipe.map((product) => (
            <div key={product.id} className="glass-card rounded-3xl border border-white/60 p-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-900/10"
                />
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">{product.name}</h3>
                  <span className="text-xs text-amber-900/50 font-medium">{product.recipe.length} ingredient(s)</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Auto-Inventory
                  </span>
                  {can('menu', 'edit') && (
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="flex items-center gap-1 text-xs font-bold text-amber-900/40 hover:text-[#3C2A21] transition-colors"
                    >
                      <Icons.Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {can('menu', 'delete') && (
                    <button
                      onClick={() => setDeletingProduct(product)}
                      className="flex items-center gap-1 text-xs font-bold text-red-500/50 hover:text-red-600 transition-colors"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {product.recipe.map((ing, idx) => {
                  const matchedIng = ingredients.find(i => i.id === ing.ingredientId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#3C2A21]">{ing.name}</p>
                        {matchedIng && (
                          <span className={`text-[10px] font-semibold ${
                            matchedIng.status === 'Out of Stock' ? 'text-red-500' :
                            matchedIng.status === 'Low Stock' ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            Stock: {matchedIng.stock}{matchedIng.unit}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-[#C08552]">
                        {ing.amount} {ing.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditRecipeModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        ingredients={ingredients}
        onUpdateProduct={onUpdateProduct}
      />
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => handleDeleteRecipe(deletingProduct)}
        title="Delete Recipe"
        message={`Are you sure you want to remove the recipe for ${deletingProduct?.name || 'this product'}? Auto-inventory deduction will stop for this item.`}
        confirmLabel="Delete Recipe"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
