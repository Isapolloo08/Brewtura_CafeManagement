import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { SearchableSelect } from './SearchableSelect';
import { ModalPortal } from './ModalPortal';
import api from '../services/api.js';

export function EditRecipeModal({ isOpen, onClose, product, ingredients, onUpdateProduct }) {
  const [recipeItems, setRecipeItems] = useState(product?.recipe?.map(r => ({ ...r })) || []);
  const [liveIngredients, setLiveIngredients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) return;
    setRecipeItems(product?.recipe?.map(r => ({ ...r })) || []);
    setLoading(true);
    api.getIngredients()
      .then(ings => setLiveIngredients(ings.map(ing => ({
        id: String(ing.id),
        name: ing.name,
        unit: ing.unit,
      }))))
      .catch(err => console.warn('Failed to fetch ingredients:', err))
      .finally(() => setLoading(false));
  }, [isOpen, product]);

  const combinedIngredients = (() => {
    const list = [...liveIngredients];
    ingredients.forEach(ing => {
      if (!list.some(i => i.id === ing.id)) {
        list.push({ id: ing.id, name: ing.name, unit: ing.unit });
      }
    });
    recipeItems.forEach(item => {
      if (!list.some(i => String(i.id) === String(item.ingredientId))) {
        list.push({ ingredientId: item.ingredientId, id: item.ingredientId, name: item.name, unit: item.unit });
      }
    });
    return list;
  })();

  const ingredientOptions = combinedIngredients.map(ing => ({
    value: ing.id,
    label: `${ing.name} (${ing.unit})`,
  }));

  if (!isOpen || !product) return null;

  const handleAddRecipeRow = () => {
    if (combinedIngredients.length === 0) return;
    const ing = combinedIngredients[0];
    setRecipeItems([...recipeItems, { ingredientId: ing.id, name: ing.name, amount: 0.1, unit: ing.unit }]);
  };

  const handleRecipeChange = (idx, field, val) => {
    const updated = [...recipeItems];
    if (field === 'ingredientId') {
      const selectedIng = combinedIngredients.find(i => i.id === val);
      if (selectedIng) {
        updated[idx].ingredientId = selectedIng.id;
        updated[idx].name = selectedIng.name;
        updated[idx].unit = selectedIng.unit;
      }
    } else if (field === 'amount') {
      updated[idx].amount = parseFloat(val) || 0;
    }
    setRecipeItems(updated);
  };

  const removeRecipeRow = (idx) => {
    setRecipeItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productId = parseInt(product.id, 10);
    const items = recipeItems
      .filter(item => item.ingredientId && !Number.isNaN(parseInt(item.ingredientId, 10)))
      .map(item => ({
        ingredient_id: parseInt(item.ingredientId, 10),
        qty_required: item.amount || 0,
      }));
    if (productId && items.length > 0) {
      try {
        await api.updateProductRecipe(productId, items);
      } catch (err) {
        console.warn('Failed to save recipe to database:', err);
      }
    }
    onUpdateProduct({ ...product, recipe: recipeItems });
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl glass-card rounded-3xl p-6 space-y-6 border border-white/60 text-[#3C2A21]">
        <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
          <div className="flex items-center gap-3">
            <img src={product.image} alt={product.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-amber-900/10" />
            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">{product.name}</h3>
              <p className="text-xs text-amber-900/60 font-medium">{(product?.recipe?.length || 0) > 0 ? 'Edit recipe / Bill of Materials' : 'Create recipe / Bill of Materials'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#3C2A21] flex items-center gap-1.5"><Icons.Flask className="w-4 h-4" /> Ingredients ({recipeItems.length})</h4>
            <button
              type="button"
              onClick={handleAddRecipeRow}
              className="text-xs font-bold text-[#C08552] hover:underline"
            >
              + Add Ingredient
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-amber-900/40 font-medium text-center py-4">Loading ingredients...</p>
            ) : recipeItems.length === 0 ? (
              <p className="text-xs text-amber-900/40 font-medium text-center py-4">No ingredients yet. Click "+ Add Ingredient" to build the recipe.</p>
            ) : (
              recipeItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <SearchableSelect
                    options={ingredientOptions}
                    value={item.ingredientId}
                    onChange={(val) => handleRecipeChange(idx, 'ingredientId', val)}
                  />

                  <input
                    type="number"
                    step="0.001"
                    value={item.amount}
                    onChange={(e) => handleRecipeChange(idx, 'amount', e.target.value)}
                    className="w-24 px-3 py-1.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
                    placeholder="Qty"
                  />

                  <span className="text-xs font-bold text-amber-900/60 w-10">{item.unit}</span>

                  <button
                    type="button"
                    onClick={() => removeRecipeRow(idx)}
                    className="text-red-500/60 hover:text-red-600 font-bold text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-amber-900/10">
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
              Save Recipe
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
