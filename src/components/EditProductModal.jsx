import React, { useState } from 'react';
import { Icons } from './Icons';
import { SearchableSelect } from './SearchableSelect';
import { CustomizationPicker } from './CustomizationPicker';
import { AddonPicker } from './AddonPicker';
import { ModalPortal } from './ModalPortal';
import { IngredientPickerModal } from './IngredientPickerModal';
import api from '../services/api.js';

export function EditProductModal({ isOpen, onClose, product, categories, ingredients, onUpdateProduct, customizationTemplates, temperatures, milks, addons }) {
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = useState('');
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || categories[0]?.name || 'Coffee');
  const [price, setPrice] = useState(product?.price || 0);
  const [description, setDescription] = useState(product?.description || '');
  const [image, setImage] = useState(product?.image || '');
  const [sizes, setSizes] = useState(() => {
    const sizeNames = new Set((customizationTemplates?.sizes || []).map(s => s.name));
    return (product?.customizations || [])
      .filter(v => v.customization_type === 'size' || (!v.customization_type && sizeNames.has(v.name)))
      .map(v => ({ ...v }));
  });
  const [otherCustomizations, setOtherCustomizations] = useState(() => {
    const sizeNames = new Set((customizationTemplates?.sizes || []).map(s => s.name));
    return (product?.customizations || [])
      .filter(v => !['size', 'temperature', 'milk', 'addon'].includes(v.customization_type))
      .filter(v => !sizeNames.has(v.name))
      .map(v => ({ ...v }));
  });
  const [tempOptions, setTempOptions] = useState(() => (product?.temperatures || []).map(t => ({ name: t.name, priceDelta: t.priceDelta })));
  const [milkOptions, setMilkOptions] = useState(() => (product?.milks || []).map(m => ({ name: m.name, priceDelta: m.priceDelta })));
  const [addonItems, setAddonItems] = useState(() => (product?.addons || []).map(a => ({ id: a.id, name: a.name, price: a.price })));
  const [recipeItems, setRecipeItems] = useState((product?.recipe || []).filter(r => !r.customizationId).map(r => ({ ...r })));
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const ingredientOptions = ingredients.map(ing => ({
    value: ing.id,
    label: `${ing.name} (${ing.unit})`,
  }));

  if (!isOpen || !product) return null;

  const handleAddIngredients = (newItems) => {
    setRecipeItems([...recipeItems, ...newItems]);
  };

  const handleRecipeChange = (idx, field, val) => {
    const updated = [...recipeItems];
    if (field === 'ingredientId') {
      const selectedIng = ingredients.find(i => i.id === val);
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
    setError('');

    const hasSizesOrOptions = sizes.length > 0 || otherCustomizations.length > 0 || tempOptions.length > 0 || milkOptions.length > 0 || addonItems.length > 0;
    if (!hasSizesOrOptions) {
      setError('Please add at least one Size or Option before saving changes.');
      setActiveTab('options');
      return;
    }

    if (!recipeItems || recipeItems.length === 0) {
      setError('Please add at least one Recipe BOM ingredient before saving changes.');
      setActiveTab('recipe');
      return;
    }

    const mergedCustomizations = [
      ...sizes.map(v => ({ ...v, customization_type: v.customization_type || 'size' })),
      ...otherCustomizations.map(v => ({ ...v, customization_type: v.customization_type || 'option' })),
      ...tempOptions.map(t => ({ name: t.name, customization_type: 'temperature', priceDelta: t.priceDelta })),
      ...milkOptions.map(m => ({ name: m.name, customization_type: 'milk', priceDelta: m.priceDelta })),
      ...addonItems.map(a => ({ name: a.name, customization_type: 'addon', priceDelta: a.price })),
    ].filter(v => v.name.trim());
    const updated = {
      ...product,
      name,
      category,
      price: parseFloat(price),
      image,
      description: description || product.description,
      customizations: mergedCustomizations,
      temperatures: tempOptions,
      milks: milkOptions,
      addons: addonItems,
      recipe: recipeItems.filter(r => !r.customizationId),
    };
    try {
      const catObj = categories.find(c => c.name === category);
      await api.updateProduct(product.id, {
        category_id: catObj ? parseInt(catObj.id, 10) : undefined,
        name,
        description,
        base_price: parseFloat(price),
        image_url: image,
        customizations: mergedCustomizations.map(v => ({
          name: v.name,
          customization_type: v.customization_type || 'option',
          price_delta: parseFloat(v.priceDelta) || 0,
          is_default: v.is_default || false,
        })),
      });
    } catch (err) {
      console.warn('API error updating product, keeping local state:', err);
    }

    const baseRecipeItems = recipeItems
      .filter(r => !r.customizationId && r.ingredientId)
      .map(r => ({ ingredient_id: parseInt(r.ingredientId, 10), qty_required: r.amount }));
    try {
      await api.updateProductRecipe(product.id, baseRecipeItems);
    } catch (err) {
      console.warn('API error updating recipe, keeping local state:', err);
    }
    onUpdateProduct(updated);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-xl glass-card rounded-3xl p-6 space-y-5 border border-white/60 text-[#3C2A21] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Edit Product</h3>
              <p className="text-xs text-amber-900/60 font-medium">Update product details, customization options &amp; recipe</p>
            </div>
            <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-amber-900/10">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'general'
                  ? 'border-[#693F27] text-[#693F27]'
                  : 'border-transparent text-amber-900/50 hover:text-[#3C2A21]'
              }`}
            >
              General Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('options')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'options'
                  ? 'border-[#693F27] text-[#693F27]'
                  : 'border-transparent text-amber-900/50 hover:text-[#3C2A21]'
              }`}
            >
              Sizes &amp; Options
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recipe')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'recipe'
                  ? 'border-[#693F27] text-[#693F27]'
                  : 'border-transparent text-amber-900/50 hover:text-[#3C2A21]'
              }`}
            >
              Recipe BOM ({recipeItems.length})
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'general' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
                      placeholder="e.g. Vanilla Cold Brew"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Base Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Product Image</label>
                    <label className="relative flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-[#C08552]/30 bg-[#FFFDF9]/50 cursor-pointer hover:border-[#C08552]/60 hover:bg-[#FFFDF9]/80 transition-all group overflow-hidden">
                      {image && (image.startsWith('data:') || image.startsWith('http') || image.startsWith('blob:')) ? (
                        <img src={image} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <svg className="w-6 h-6 text-[#C08552]/60 group-hover:text-[#C08552] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <span className="text-[11px] font-bold text-amber-900/50 group-hover:text-[#693F27] transition-colors">Click to upload image</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setImage(ev.target?.result || image);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
                    placeholder="Short product summary..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'options' && (
              <div className="space-y-4 animate-fadeIn">
                <CustomizationPicker
                  title="Sizes"
                  subtitle="Search & click to add sizes"
                  options={customizationTemplates?.sizes || []}
                  selected={sizes}
                  onChange={setSizes}
                  placeholder="Search sizes... e.g. Medium (16oz)"
                  noResultsText="No sizes found"
                />

                <CustomizationPicker
                  title="Other Customizations"
                  subtitle="Hot/Iced, shots, milk, etc."
                  options={customizationTemplates?.options || []}
                  selected={otherCustomizations}
                  onChange={setOtherCustomizations}
                  placeholder="Search options... e.g. Iced, Double Shot"
                  noResultsText="No options found"
                />

                <CustomizationPicker
                  title="Temperature"
                  subtitle="Select serving temperatures"
                  options={temperatures || []}
                  selected={tempOptions}
                  onChange={setTempOptions}
                  placeholder="Search temperatures... e.g. Hot, Iced"
                  noResultsText="No temperature options found"
                />

                <CustomizationPicker
                  title="Milk"
                  subtitle="Select milk options"
                  options={milks || []}
                  selected={milkOptions}
                  onChange={setMilkOptions}
                  placeholder="Search milk... e.g. Oat Milk, Whole Milk"
                  noResultsText="No milk options found"
                />

                <AddonPicker
                  title="Add-Ons"
                  subtitle="Select available add-ons"
                  options={addons || []}
                  selected={addonItems}
                  onChange={setAddonItems}
                  placeholder="Search add-ons... e.g. Extra Shot, Caramel Drizzle"
                  noResultsText="No add-ons found"
                />
              </div>
            )}

            {activeTab === 'recipe' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#3C2A21] flex items-center gap-1.5">
                    <Icons.Flask className="w-4 h-4" /> Recipe / Bill of Materials (BOM)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowIngredientPicker(true)}
                    className="text-xs font-bold text-[#C08552] hover:underline"
                  >
                    + Select Ingredients
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {recipeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <SearchableSelect
                        options={ingredientOptions}
                        value={item.ingredientId}
                        onChange={(val) => handleRecipeChange(idx, 'ingredientId', val)}
                        searchPlaceholder="Search ingredients..."
                        noResultsText="No ingredients found"
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
                  ))}
                  {recipeItems.length === 0 && (
                    <p className="text-xs text-amber-900/40 font-medium text-center py-4">No ingredients yet. Click "+ Select Ingredients" to add.</p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <span className="text-red-600 font-bold text-xs mt-0.5">⚠</span>
                <p className="text-xs font-semibold text-red-700">{error}</p>
              </div>
            )}

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
                Save Changes
              </button>
            </div>
          </form>
        </div>
        {showIngredientPicker && (
          <IngredientPickerModal
            onClose={() => setShowIngredientPicker(false)}
            ingredients={ingredients}
            existingItems={recipeItems}
            onAdd={handleAddIngredients}
          />
        )}
      </div>
    </ModalPortal>
  );
}
