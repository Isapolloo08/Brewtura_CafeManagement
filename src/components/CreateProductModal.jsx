import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { SearchableSelect } from './SearchableSelect';
import { CustomizationPicker } from './CustomizationPicker';
import { AddonPicker } from './AddonPicker';
import { ModalPortal } from './ModalPortal';
import api from '../services/api.js';
function IngredientPickerModal({ onClose, ingredients, existingItems, onAdd }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({});
  const [list, setList] = useState(ingredients);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getIngredients()
      .then(ings => {
        if (!cancelled) {
          setList(ings.map(ing => ({
            id: String(ing.id),
            name: ing.name,
            unit: ing.unit,
          })));
        }
      })
      .catch(err => console.warn('Failed to fetch ingredients:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const existingIds = new Set(existingItems.map(i => String(i.ingredientId)));
  const filtered = list.filter(ing =>
    !existingIds.has(String(ing.id)) &&
    ing.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (ing) => {
    const id = String(ing.id);
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleConfirm = () => {
    const newItems = list
      .filter(ing => selected[String(ing.id)])
      .map(ing => ({ ingredientId: String(ing.id), name: ing.name, unit: ing.unit, amount: 0.1 }));
    if (newItems.length > 0) onAdd(newItems);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md glass-card rounded-3xl p-5 space-y-4 border border-white/60 text-[#3C2A21]">
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
            <div>
              <h4 className="font-heading font-extrabold text-base text-[#3C2A21]">Add Ingredients</h4>
              <p className="text-[11px] text-amber-900/60 font-medium">Select multiple ingredients at once</p>
            </div>
            <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
          </div>

          <div className="p-1.5 border-b border-amber-900/10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-[#3C2A21]"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {loading ? (
              <p className="text-xs text-amber-900/40 font-medium text-center py-4">Loading ingredients...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-amber-900/40 font-medium text-center py-4">
                {existingIds.size > 0 ? 'All ingredients are already added.' : 'No ingredients found.'}
              </p>
            ) : (
              filtered.map(ing => {
                const id = String(ing.id);
                const checked = !!selected[id];
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'bg-[#3C2A21]/5 border-[#C08552]/40'
                        : 'border-amber-900/10 hover:bg-amber-900/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(ing)}
                      className="rounded-md text-[#C08552] focus:ring-[#C08552] focus:ring-offset-0 w-4 h-4 border-[#C08552]/40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-[#3C2A21] truncate">{ing.name}</p>
                      <p className="text-[10px] text-amber-900/50 font-semibold">{ing.unit}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all disabled:opacity-50"
            >
              Add {selectedCount > 0 ? `${selectedCount} ` : ''}Selected
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function CreateProductModal({ isOpen, onClose, onSaveProduct, categories, ingredients, customizationTemplates, temperatures, milks, addons, recipeTemplates }) {
  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Coffee');
  const [price, setPrice] = useState(4.50);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80');
  const [error, setError] = useState('');

  // Customization / Size state (picked from library via dropdown)
  const [sizes, setSizes] = useState([]);
  const [otherCustomizations, setOtherCustomizations] = useState([]);

  // Temperature & Milk options (customer-facing selectors)
  const [tempOptions, setTempOptions] = useState([]);
  const [milkOptions, setMilkOptions] = useState([]);

  // Add-on options
  const [addonItems, setAddonItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setTempOptions(prev => prev.length > 0 ? prev : (temperatures[0] ? [{ name: temperatures[0].name, priceDelta: temperatures[0].priceDelta }] : []));
      setMilkOptions(prev => prev.length > 0 ? prev : (milks[0] ? [{ name: milks[0].name, priceDelta: milks[0].priceDelta }] : []));
    }
  }, [isOpen, temperatures, milks]);

  // Recipe builder state
  const [recipeItems, setRecipeItems] = useState([
    { ingredientId: ingredients[0]?.id || 'ing-1', name: ingredients[0]?.name || 'House Blend Coffee Beans', amount: 0.02, unit: ingredients[0]?.unit || 'kg' }
  ]);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const ingredientOptions = (() => {
    const options = ingredients.map(ing => ({
      value: ing.id,
      label: `${ing.name} (${ing.unit})`,
    }));
    recipeItems.forEach(item => {
      if (!options.some(o => String(o.value) === String(item.ingredientId))) {
        options.push({ value: item.ingredientId, label: `${item.name} (${item.unit})` });
      }
    });
    return options;
  })();

  if (!isOpen) return null;

  const calculateTotalCost = () => {
    const ingredientCost = recipeItems.reduce((sum, item) => {
      const ing = ingredients.find(i => String(i.id) === String(item.ingredientId));
      return sum + (ing ? ing.costPerUnit * (parseFloat(item.amount) || 0) : 0);
    }, 0);
    const sizeCost = sizes.reduce((sum, v) => sum + (parseFloat(v.priceDelta) || 0), 0);
    const addOnCost = otherCustomizations.reduce((sum, v) => sum + (parseFloat(v.priceDelta) || 0), 0);
    return ingredientCost + sizeCost + addOnCost;
  };

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

  const handleLoadRecipeTemplate = (templateId) => {
    if (!templateId) return;
    const tpl = recipeTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    setRecipeItems(tpl.items.map(i => ({
      ingredientId: i.ingredientId,
      name: i.name,
      unit: i.unit,
      amount: i.amount,
    })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const hasSizesOrOptions = sizes.length > 0 || otherCustomizations.length > 0 || tempOptions.length > 0 || milkOptions.length > 0 || addonItems.length > 0;
    if (!hasSizesOrOptions) {
      setError('Please add at least one Size or Option before creating the product.');
      setActiveTab('options');
      return;
    }

    if (!recipeItems || recipeItems.length === 0) {
      setError('Please add at least one Recipe BOM ingredient before creating the product.');
      setActiveTab('recipe');
      return;
    }

    const mergedCustomizations = [...sizes, ...otherCustomizations].filter(v => v.name.trim());

    let createdId = `prod-${Date.now()}`;
    try {
      const catObj = categories.find(c => c.name === category);
      const catId = catObj ? parseInt(catObj.id, 10) : 1;

      const res = await api.createProduct({
        category_id: isNaN(catId) ? 1 : catId,
        name,
        description,
        base_price: parseFloat(price),
        image_url: image,
        customizations: mergedCustomizations.map(v => ({
          name: v.name,
          customization_type: v.customization_type || 'option',
          price_delta: parseFloat(v.priceDelta) || 0,
          is_default: false,
        })),
        temperature_ids: tempOptions
          .map(t => temperatures.find(x => x.name === t.name)?.id)
          .filter(Boolean)
          .map(Number),
        milk_ids: milkOptions
          .map(m => milks.find(x => x.name === m.name)?.id)
          .filter(Boolean)
          .map(Number),
        addons: addonItems.map(a => Number(a.id))
      });
      if (res && res.id) {
        createdId = String(res.id);
        for (const item of recipeItems) {
          try {
            await api.createRecipeItem({
              product_id: parseInt(res.id, 10),
              ingredient_id: parseInt(item.ingredientId, 10),
              qty_required: item.amount
            });
          } catch (recipeErr) {
            console.warn('Failed to save recipe item:', recipeErr);
          }
        }
      }
    } catch (err) {
      if (err.status === 413 || err.message?.toLowerCase().includes('too large') || err.message?.toLowerCase().includes('payload')) {
        setError('Image file is too large. Please use a smaller image (under 10MB).');
        return;
      }
      console.warn('API Product creation error, fallback to local:', err);
    }

    onSaveProduct({
      id: createdId,
      name,
      category,
      price: parseFloat(price),
      status: 'Available',
      image,
      description: description || 'Handcrafted Brewtura coffee shop menu item.',
      customizations: mergedCustomizations.filter(v => v.name.trim()),
      temperatures: tempOptions,
      milks: milkOptions,
      addons: addonItems,
      recipe: recipeItems
    });
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-xl glass-card rounded-3xl p-6 space-y-5 border border-white/60 text-[#3C2A21] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-3">
            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Add New Menu Item</h3>
              <p className="text-xs text-amber-900/60 font-medium">Configure product &amp; attach recipe BOM ingredients</p>
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
                    <button
                      type="button"
                      onClick={() => setPrice(calculateTotalCost())}
                      className="mt-1.5 w-full py-1.5 rounded-lg bg-amber-900/10 text-[10px] font-bold text-[#693F27] hover:bg-amber-900/20 transition-colors"
                    >
                      Auto-calc from ingredients &amp; options
                    </button>
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
                Create Product
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
