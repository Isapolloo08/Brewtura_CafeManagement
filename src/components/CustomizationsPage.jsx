import React, { useState } from 'react';
import { Icons } from './Icons';
import { SearchableSelect } from './SearchableSelect';
import { EditCustomizationModal } from './EditCustomizationModal';
import { ConfirmModal } from './ConfirmModal';
import { ModalPortal } from './ModalPortal';
import api from '../services/api.js';

function CreateCustomizationFormModal({ isOpen, onClose, products, ingredients, onUpdateProduct, customizationTemplates, onRefreshCustomizationTemplates }) {
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [priceDelta, setPriceDelta] = useState(0);
  const [recipeItems, setRecipeItems] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const productOptions = products.map(p => ({ value: String(p.id), label: p.name }));
  const templateOptions = [
    ...(customizationTemplates?.sizes || []),
    ...(customizationTemplates?.options || []),
  ].map(t => ({ value: t.name, label: t.name, priceDelta: t.priceDelta }));
  const ingredientOptions = ingredients.map(ing => ({
    value: String(ing.id),
    label: `${ing.name} (${ing.unit})`,
  }));

  const resetForm = () => {
    setProductId('');
    setName('');
    setPriceDelta(0);
    setRecipeItems([]);
    setError('');
  };

  const handleAddRecipeRow = () => {
    if (ingredients.length === 0) return;
    const ing = ingredients[0];
    setRecipeItems([...recipeItems, { ingredientId: String(ing.id), name: ing.name, amount: 0.1, unit: ing.unit }]);
  };

  const handleRecipeChange = (idx, field, val) => {
    const updated = [...recipeItems];
    if (field === 'ingredientId') {
      const selectedIng = ingredients.find(i => String(i.id) === val);
      if (selectedIng) {
        updated[idx].ingredientId = String(selectedIng.id);
        updated[idx].name = selectedIng.name;
        updated[idx].unit = selectedIng.unit;
      }
    } else if (field === 'amount') {
      updated[idx].amount = parseFloat(val) || 0;
    }
    setRecipeItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!productId) {
      setError('Please select a product.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter or pick a customization name.');
      return;
    }

    const product = products.find(p => String(p.id) === productId);
    if (!product) return;

    const trimmedName = name.trim();
    const delta = parseFloat(priceDelta) || 0;
    setSaving(true);

    // Keep the Customization Library in sync: add the template if it's a brand-new name
    const existsInLibrary = templateOptions.some(t => t.value === trimmedName);
    if (!existsInLibrary) {
      try {
        await api.createCustomizationTemplate({
          name: trimmedName,
          customization_type: 'option',
          default_price_delta: delta,
        });
      } catch (err) {
        console.warn('Failed to add template to library:', err);
      }
    }

    let customizationId = null;
    try {
      const res = await api.createCustomization({
        product_id: parseInt(productId, 10),
        name: trimmedName,
        price_delta: delta,
        is_default: false,
      });
      if (res && res.id) customizationId = res.id;
    } catch (err) {
      console.warn('Failed to save customization:', err);
    }

    // Save per-customization recipe (BOM) using the created customization id
    for (const item of recipeItems) {
      if (!item.ingredientId) continue;
      try {
        await api.createRecipeItem({
          product_id: parseInt(productId, 10),
          product_customization_id: customizationId ? parseInt(customizationId, 10) : null,
          ingredient_id: parseInt(item.ingredientId, 10),
          qty_required: item.amount,
        });
      } catch (recipeErr) {
        console.warn('Failed to save customization recipe item:', recipeErr);
      }
    }

    onUpdateProduct({
      ...product,
      customizations: [...(product.customizations || []), { name: trimmedName, priceDelta: delta }],
    });
    onRefreshCustomizationTemplates();

    setSaving(false);
    resetForm();
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-6 border border-white/60 text-[#3C2A21] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
          <div>
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Create Customization</h3>
            <p className="text-xs text-amber-900/60 font-medium">Attach a size or add-on option to a product</p>
          </div>
          <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Product</label>
            <SearchableSelect
              options={productOptions}
              value={productId}
              onChange={(val) => { setProductId(val); setError(''); }}
              placeholder="Search products..."
              searchPlaceholder="Search products..."
              noResultsText="No products found"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Customization Name</label>
            <input
              type="text"
              list="template-suggestions"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                const t = templateOptions.find(o => o.value === val);
                if (t) setPriceDelta(t.priceDelta);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
              placeholder="Search or type size / option..."
              autoFocus
            />
            <datalist id="template-suggestions">
              {templateOptions.map(t => <option key={t.value} value={t.value} />)}
            </datalist>
            <p className="text-[10px] text-amber-900/40 font-medium mt-1">Pick from the library or type a new one — it's added to the library automatically.</p>
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
            <p className="text-[10px] text-amber-900/40 font-medium mt-1">Base customization = $0. Enter additional cost for upsized options.</p>
          </div>

          {/* Customization Recipe / BOM Ingredient Binding */}
          <div className="pt-3 border-t border-amber-900/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-[#3C2A21] flex items-center gap-1.5"><Icons.Flask className="w-4 h-4" /> Customization Recipe (BOM)</h4>
              <button
                type="button"
                onClick={handleAddRecipeRow}
                className="text-xs font-bold text-[#C08552] hover:underline"
              >
                + Add Ingredient
              </button>
            </div>
            <p className="text-[10px] text-amber-900/40 font-medium -mt-1">Optional: define ingredients used for this customization size/option. Leave empty to share the product's base recipe.</p>

            <div className="space-y-2">
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
                    onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))}
                    className="text-red-500/50 hover:text-red-600 transition-colors"
                    title="Remove"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {recipeItems.length === 0 && (
                <p className="text-[11px] text-amber-900/40 font-medium text-center py-2">No ingredients yet. Click "+ Add Ingredient" to build the customization recipe.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <span className="text-red-600 font-bold text-xs mt-0.5">⚠</span>
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

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
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Customization'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

function TemplateFormModal({ isOpen, onClose, initial, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'size');
  const [priceDelta, setPriceDelta] = useState(initial?.priceDelta ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    setSaving(true);
    const ok = await onSave({ name: name.trim(), type, priceDelta: parseFloat(priceDelta) || 0 });
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setError('Failed to save template. Check that the name is unique and try again.');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-6 border border-white/60 text-[#3C2A21]">
        <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
          <div>
            <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">{initial ? 'Edit Template' : 'Create Template'}</h3>
            <p className="text-xs text-amber-900/60 font-medium">Add a predefined size or add-on option to the library</p>
          </div>
          <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Template Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
              placeholder="e.g. Small (12oz) / Double Shot"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
            >
              <option value="size">Size</option>
              <option value="option">Add-on Option</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Default Price Delta ($)</label>
            <input
              type="number"
              step="0.01"
              value={priceDelta}
              onChange={(e) => setPriceDelta(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
              placeholder="0.00"
            />
            <p className="text-[10px] text-amber-900/40 font-medium mt-1">Base customization = $0. Extra cost applied to base price.</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <span className="text-red-600 font-bold text-xs mt-0.5">⚠</span>
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

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
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all disabled:opacity-60"
            >
              {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ModalPortal>
  );
}

function CustomizationPreviewModal({ isOpen, onClose, customization }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!isOpen || !customization) return;
    setRecipes([]);
    setLoading(true);
    if (customization.id) {
      api.getCustomizationRecipes(customization.id)
        .then(res => {
          setRecipes(Array.isArray(res) ? res : []);
        })
        .catch(err => {
          console.warn('Failed to load customization recipes:', err);
          setRecipes([]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isOpen, customization]);

  if (!isOpen || !customization) return null;

  const totalPrice = (parseFloat(customization.productPrice) || 0) + (parseFloat(customization.priceDelta) || 0);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-5 border border-white/60 text-[#3C2A21] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Customization Preview</h3>
              <p className="text-xs text-amber-900/60 font-medium">Size / add-on detail view</p>
            </div>
            <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
          </div>

          {/* Product + Customization Header */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-amber-900/10 bg-amber-900/[0.03]">
            <img
              src={customization.productImage}
              alt={customization.productName}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-900/10"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">{customization.productName}</p>
              <h4 className="font-heading font-extrabold text-lg text-[#3C2A21] truncate">{customization.name}</h4>
              <p className="text-xs font-semibold text-amber-900/60">Product price <span className="font-extrabold text-[#693F27]">${(customization.productPrice || 0).toFixed ? customization.productPrice.toFixed(2) : '0.00'}</span></p>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-amber-900/10 bg-white/50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/40 mb-1">Price Delta</p>
              <p className={`font-heading font-extrabold text-xl ${customization.priceDelta === 0 ? 'text-amber-900/40' : 'text-emerald-700'}`}>
                {customization.priceDelta === 0 ? '$0.00' : `+$${customization.priceDelta.toFixed(2)}`}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-900/10 bg-white/50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/40 mb-1">Total Price</p>
              <p className="font-heading font-extrabold text-xl text-[#3C2A21]">${totalPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Recipe / BOM */}
          <div className="pt-2 border-t border-amber-900/10 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-[#3C2A21] flex items-center gap-1.5"><Icons.Flask className="w-4 h-4" /> Customization Recipe (BOM)</h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-900/10 text-[#693F27] text-[10px] font-extrabold">{recipes.length} ingredients</span>
            </div>

            {loading ? (
              <p className="text-xs text-amber-900/40 font-medium text-center py-4">Loading recipe...</p>
            ) : recipes.length === 0 ? (
              <p className="text-[11px] text-amber-900/40 font-medium text-center py-3">No dedicated recipe — this customization shares the product's base recipe.</p>
            ) : (
              <div className="space-y-1.5">
                {recipes.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/50 border border-amber-900/10 text-xs">
                    <span className="font-semibold text-[#3C2A21]">{r.ingredient_name}</span>
                    <span className="font-bold text-[#693F27]">{parseFloat(r.qty_required)}{r.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

const defaultFormatValue = (it) => {
  const d = parseFloat(it.priceDelta) || 0;
  if (d === 0) return 'Base';
  return d > 0 ? `+$${d.toFixed(2)}` : `-$${Math.abs(d).toFixed(2)}`;
};

function OptionLibraryCard({ title, subtitle, items, canEdit, canDelete, onAdd, onEdit, onDelete, formatValue = defaultFormatValue }) {
  return (
    <div className="rounded-2xl border border-amber-900/10 bg-amber-900/[0.03] p-4">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-xs text-[#3C2A21]">{title}</h4>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-900/10 text-[#693F27] text-[10px] font-extrabold">{items.length}</span>
          {canEdit && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#3C2A21] text-amber-100 text-[10px] font-bold shadow hover:brightness-110 transition-all"
            >
              <Icons.Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-amber-900/40 font-bold mb-3">{subtitle}</p>
      <div className="space-y-1.5">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/50 border border-amber-900/10 text-xs">
            <span className="font-semibold text-[#3C2A21] flex-1 truncate">{it.name}</span>
            <span className={`font-bold whitespace-nowrap ${formatValue(it) === 'Base' || formatValue(it).startsWith('$0.00') ? 'text-amber-900/40' : 'text-emerald-700'}`}>
              {formatValue(it)}
            </span>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button type="button" onClick={() => onEdit(it)} title="Edit" className="text-amber-900/40 hover:text-[#3C2A21] transition-colors">
                  <Icons.Edit className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button type="button" onClick={() => onDelete(it)} title="Delete" className="text-red-500/50 hover:text-red-600 transition-colors">
                  <Icons.Trash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-amber-900/40 font-medium text-center py-2">No options added.</p>
        )}
      </div>
    </div>
  );
}

function OptionFormModal({ isOpen, onClose, initial, onSave, title, valueKey = 'priceDelta', valueLabel = 'Price Delta ($)', valueHint, namePlaceholder }) {
  const [name, setName] = useState(initial?.name || '');
  const [value, setValue] = useState(initial?.[valueKey] ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    const payload = { name: name.trim() };
    payload[valueKey] = parseFloat(value) || 0;
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setError('Failed to save. Check the name is unique and try again.');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md glass-card rounded-3xl p-6 space-y-6 border border-white/60 text-[#3C2A21]">
          <div className="flex items-center justify-between border-b border-amber-900/10 pb-4">
            <div>
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">{initial ? `Edit ${title}` : `Add ${title}`}</h3>
              <p className="text-xs text-amber-900/60 font-medium">Configure {title.toLowerCase()} option</p>
            </div>
            <button onClick={onClose} className="text-amber-900/40 hover:text-[#3C2A21] font-bold text-lg">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4A2E2A] mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21]"
                placeholder={namePlaceholder || (title === 'Temperature' ? 'e.g. Hot, Iced, Room Temp' : 'e.g. Whole Milk, Oat Milk')}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A2E2A] mb-1">{valueLabel}</label>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
                placeholder="0.00"
              />
              {valueHint && <p className="text-[10px] text-amber-900/40 font-medium mt-1">{valueHint}</p>}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <span className="text-red-600 font-bold text-xs mt-0.5">⚠</span>
                <p className="text-xs font-semibold text-red-700">{error}</p>
              </div>
            )}

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
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Option'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

export function CustomizationsPage({ products, ingredients, can, onUpdateProduct, customizationTemplates, temperatures, milks, addons, onRefreshCustomizationTemplates, onRefreshTemperatures, onRefreshMilks, onRefreshAddons }) {
  const [editingCustomization, setEditingCustomization] = useState(null);
  const [previewCustomization, setPreviewCustomization] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showTemplateCreate, setShowTemplateCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(null);

  const [showTempCreate, setShowTempCreate] = useState(false);
  const [editingTemp, setEditingTemp] = useState(null);
  const [deletingTemp, setDeletingTemp] = useState(null);

  const [showMilkCreate, setShowMilkCreate] = useState(false);
  const [editingMilk, setEditingMilk] = useState(null);
  const [deletingMilk, setDeletingMilk] = useState(null);

  const [showAddonCreate, setShowAddonCreate] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [deletingAddon, setDeletingAddon] = useState(null);

  const allCustomizations = products.flatMap(product =>
    (product.customizations || []).map((v, idx) => ({
      ...v,
      id: v.id || undefined,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      productPrice: parseFloat(product.price) || 0,
      _idx: idx,
    }))
  );

  const handleSaveTemplate = async (data) => {
    try {
      if (editingTemplate) {
        await api.updateCustomizationTemplate(editingTemplate.id, {
          name: data.name,
          customization_type: data.type,
          default_price_delta: data.priceDelta,
        });
      } else {
        await api.createCustomizationTemplate({
          name: data.name,
          customization_type: data.type,
          default_price_delta: data.priceDelta,
        });
      }
      setEditingTemplate(null);
      onRefreshCustomizationTemplates();
      return true;
    } catch (err) {
      console.warn('Failed to save customization template:', err);
      return false;
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await api.deleteCustomizationTemplate(deletingTemplate.id);
    } catch (err) {
      console.warn('Failed to delete customization template:', err);
    }
    setDeletingTemplate(null);
    onRefreshCustomizationTemplates();
  };

  const closeTemplateModals = () => {
    setShowTemplateCreate(false);
    setEditingTemplate(null);
  };

  const handleSaveTempOption = async (data) => {
    try {
      if (editingTemp) {
        await api.updateTemperatureOption(editingTemp.id, { name: data.name, price_delta: data.priceDelta });
      } else {
        await api.createTemperatureOption({ name: data.name, price_delta: data.priceDelta });
      }
      // Sync to customization_templates table so it appears in the customization library
      try {
        await api.createCustomizationTemplate({
          name: data.name,
          customization_type: 'option',
          default_price_delta: data.priceDelta,
        });
      } catch (tmplErr) {
        console.warn('Failed to insert temperature option into customization_templates:', tmplErr);
      }
      setEditingTemp(null);
      onRefreshTemperatures();
      onRefreshCustomizationTemplates();
      return true;
    } catch (err) {
      console.warn('Failed to save temperature option:', err);
      return false;
    }
  };

  const handleDeleteTempOption = async () => {
    if (!deletingTemp) return;
    try {
      await api.deleteTemperatureOption(deletingTemp.id);
    } catch (err) {
      console.warn('Failed to delete temperature option:', err);
    }
    setDeletingTemp(null);
    onRefreshTemperatures();
  };

  const handleSaveMilkOption = async (data) => {
    try {
      if (editingMilk) {
        await api.updateMilkOption(editingMilk.id, { name: data.name, price_delta: data.priceDelta });
      } else {
        await api.createMilkOption({ name: data.name, price_delta: data.priceDelta });
      }
      // Sync to customization_templates table so it appears in the customization library
      try {
        await api.createCustomizationTemplate({
          name: data.name,
          customization_type: 'option',
          default_price_delta: data.priceDelta,
        });
      } catch (tmplErr) {
        console.warn('Failed to insert milk option into customization_templates:', tmplErr);
      }
      setEditingMilk(null);
      onRefreshMilks();
      onRefreshCustomizationTemplates();
      return true;
    } catch (err) {
      console.warn('Failed to save milk option:', err);
      return false;
    }
  };

  const handleDeleteMilkOption = async () => {
    if (!deletingMilk) return;
    try {
      await api.deleteMilkOption(deletingMilk.id);
    } catch (err) {
      console.warn('Failed to delete milk option:', err);
    }
    setDeletingMilk(null);
    onRefreshMilks();
  };

  const handleSaveAddon = async (data) => {
    try {
      if (editingAddon) {
        await api.updateAddon(editingAddon.id, { name: data.name, price: data.price });
      } else {
        await api.createAddon({ name: data.name, price: data.price });
      }
      // Sync to customization_templates table so it appears in the customization library
      try {
        await api.createCustomizationTemplate({
          name: data.name,
          customization_type: 'option',
          default_price_delta: data.price,
        });
      } catch (tmplErr) {
        console.warn('Failed to insert add-on into customization_templates:', tmplErr);
      }
      setEditingAddon(null);
      onRefreshAddons();
      onRefreshCustomizationTemplates();
      return true;
    } catch (err) {
      console.warn('Failed to save add-on:', err);
      return false;
    }
  };

  const handleDeleteAddon = async () => {
    if (!deletingAddon) return;
    try {
      await api.deleteAddon(deletingAddon.id);
    } catch (err) {
      console.warn('Failed to delete add-on:', err);
    }
    setDeletingAddon(null);
    onRefreshAddons();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Product Variations
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">
            Customizations
          </h2>
          <p className="text-xs text-amber-900/70 font-medium">
            Manage size options, add-ons, and price deltas across all products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 rounded-2xl bg-amber-900/5 text-[#693F27] text-xs font-extrabold">
            {allCustomizations.length} total customizations
          </span>
          {can('menu', 'add') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow hover:brightness-110 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Customization
            </button>
          )}
        </div>
      </div>

      {/* Customization Library Inventory */}
      <div className="glass-card rounded-3xl border border-white/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#693F27]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Customization Library</h3>
            <span className="text-[10px] text-amber-900/40 font-bold">Predefined sizes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-2xl bg-amber-900/5 text-[#693F27] text-[11px] font-extrabold">
              {customizationTemplates.sizes.length} templates
            </span>
            {can('menu', 'add') && (
              <button
                onClick={() => { setEditingTemplate(null); setShowTemplateCreate(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3C2A21] text-amber-100 text-[11px] font-bold shadow hover:brightness-110 transition-all"
              >
                <Icons.Plus className="w-3.5 h-3.5" /> Create
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-amber-900/10 bg-amber-900/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-xs text-[#3C2A21]">Sizes</h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-900/10 text-[#693F27] text-[10px] font-extrabold">
                {customizationTemplates.sizes.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {customizationTemplates.sizes.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/50 border border-amber-900/10 text-xs">
                  <span className="font-semibold text-[#3C2A21] flex-1 truncate">{s.name}</span>
                  <span className={`font-bold whitespace-nowrap ${s.priceDelta === 0 ? 'text-amber-900/40' : 'text-emerald-700'}`}>
                    {s.priceDelta === 0 ? 'Base' : `+$${s.priceDelta.toFixed(2)}`}
                  </span>
                  <div className="flex items-center gap-1">
                    {can('menu', 'edit') && (
                      <button
                        type="button"
                        onClick={() => setEditingTemplate(s)}
                        title="Edit"
                        className="text-amber-900/40 hover:text-[#3C2A21] transition-colors"
                      >
                        <Icons.Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {can('menu', 'delete') && (
                      <button
                        type="button"
                        onClick={() => setDeletingTemplate(s)}
                        title="Delete"
                        className="text-red-500/50 hover:text-red-600 transition-colors"
                      >
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {customizationTemplates.sizes.length === 0 && (
                <p className="text-xs text-amber-900/40 font-medium text-center py-2">No sizes in library.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Temperature, Milk & Add-Ons Libraries */}
      <div className="glass-card rounded-3xl border border-white/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#693F27]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 6h10M7 10h10M7 14h10M7 18h10" />
            </svg>
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Temperature, Milk &amp; Add-Ons</h3>
            <span className="text-[10px] text-amber-900/40 font-bold">Customer-facing product detail selectors</span>
          </div>
          <span className="px-3 py-1.5 rounded-2xl bg-amber-900/5 text-[#693F27] text-[11px] font-extrabold">
            {temperatures.length + milks.length + (addons?.length || 0)} options
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <OptionLibraryCard
            title="Temperatures"
            subtitle="e.g. Hot, Iced, Room Temp"
            items={temperatures}
            canEdit={can('menu', 'edit')}
            canDelete={can('menu', 'delete')}
            onAdd={() => { setEditingTemp(null); setShowTempCreate(true); }}
            onEdit={(it) => setEditingTemp(it)}
            onDelete={(it) => setDeletingTemp(it)}
          />

          <OptionLibraryCard
            title="Milk"
            subtitle="e.g. Whole Milk, Oat Milk, Almond Milk"
            items={milks}
            canEdit={can('menu', 'edit')}
            canDelete={can('menu', 'delete')}
            onAdd={() => { setEditingMilk(null); setShowMilkCreate(true); }}
            onEdit={(it) => setEditingMilk(it)}
            onDelete={(it) => setDeletingMilk(it)}
          />

          <OptionLibraryCard
            title="Add-Ons"
            subtitle="e.g. Extra Shot, Caramel Drizzle, Whipped Cream"
            items={addons || []}
            canEdit={can('menu', 'edit')}
            canDelete={can('menu', 'delete')}
            formatValue={(it) => `$${(parseFloat(it.price) || 0).toFixed(2)}`}
            onAdd={() => { setEditingAddon(null); setShowAddonCreate(true); }}
            onEdit={(it) => setEditingAddon(it)}
            onDelete={(it) => setDeletingAddon(it)}
          />
        </div>
      </div>

      {allCustomizations.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/60 p-12 text-center">
          <p className="text-amber-900/50 text-sm font-semibold">No customizations defined. Add customizations when creating a product.</p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-900/10 text-amber-900/60 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Customization</th>
                  <th className="py-3 px-4">Price Delta</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/10 text-xs font-semibold">
                {allCustomizations.map((v, idx) => (
                  <tr key={`${v.productId}-${idx}`} className="hover:bg-amber-900/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.productImage}
                          alt={v.productName}
                          className="w-8 h-8 rounded-lg object-cover ring-2 ring-amber-900/10"
                        />
                        <span className="text-[#3C2A21]">{v.productName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-amber-900/80">{v.name}</td>
                    <td className="py-3 px-4">
                      {v.priceDelta === 0 ? (
                        <span className="text-amber-900/40">Base price</span>
                      ) : (
                        <span className="text-emerald-700 font-extrabold">+${v.priceDelta.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setPreviewCustomization(v)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#C08552] hover:text-[#693F27] transition-colors"
                        >
                          <Icons.Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        {can('menu', 'edit') && (
                          <button
                            onClick={() => setEditingCustomization(v)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-900/40 hover:text-[#3C2A21] transition-colors"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditCustomizationModal
        isOpen={!!editingCustomization}
        onClose={() => setEditingCustomization(null)}
        customization={editingCustomization}
        products={products}
        onUpdateProduct={onUpdateProduct}
      />

      <CustomizationPreviewModal
        isOpen={!!previewCustomization}
        onClose={() => setPreviewCustomization(null)}
        customization={previewCustomization}
      />

      <CreateCustomizationFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        products={products}
        ingredients={ingredients}
        onUpdateProduct={onUpdateProduct}
        customizationTemplates={customizationTemplates}
        onRefreshCustomizationTemplates={onRefreshCustomizationTemplates}
      />

      <TemplateFormModal
        key={editingTemplate ? editingTemplate.id : 'create'}
        isOpen={showTemplateCreate || !!editingTemplate}
        initial={editingTemplate}
        onClose={closeTemplateModals}
        onSave={handleSaveTemplate}
      />

      <ConfirmModal
        isOpen={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        message={`Remove "${deletingTemplate?.name}" from the customization library? Products already using it won't be affected.`}
        confirmLabel="Delete"
      />

      <OptionFormModal
        key={editingTemp ? editingTemp.id : 'temp-create'}
        isOpen={showTempCreate || !!editingTemp}
        initial={editingTemp}
        title="Temperature"
        onClose={() => { setShowTempCreate(false); setEditingTemp(null); }}
        onSave={handleSaveTempOption}
      />

      <OptionFormModal
        key={editingMilk ? editingMilk.id : 'milk-create'}
        isOpen={showMilkCreate || !!editingMilk}
        initial={editingMilk}
        title="Milk"
        onClose={() => { setShowMilkCreate(false); setEditingMilk(null); }}
        onSave={handleSaveMilkOption}
      />

      <OptionFormModal
        key={editingAddon ? editingAddon.id : 'addon-create'}
        isOpen={showAddonCreate || !!editingAddon}
        initial={editingAddon}
        title="Add-On"
        valueKey="price"
        valueLabel="Price ($)"
        valueHint="Selling price charged for this add-on."
        namePlaceholder="e.g. Extra Shot, Caramel Drizzle"
        onClose={() => { setShowAddonCreate(false); setEditingAddon(null); }}
        onSave={handleSaveAddon}
      />

      <ConfirmModal
        isOpen={!!deletingTemp}
        onClose={() => setDeletingTemp(null)}
        onConfirm={handleDeleteTempOption}
        title="Delete Temperature"
        message={`Remove "${deletingTemp?.name}" from the temperature options? Products already using it won't be affected.`}
        confirmLabel="Delete"
      />

      <ConfirmModal
        isOpen={!!deletingMilk}
        onClose={() => setDeletingMilk(null)}
        onConfirm={handleDeleteMilkOption}
        title="Delete Milk"
        message={`Remove "${deletingMilk?.name}" from the milk options? Products already using it won't be affected.`}
        confirmLabel="Delete"
      />

      <ConfirmModal
        isOpen={!!deletingAddon}
        onClose={() => setDeletingAddon(null)}
        onConfirm={handleDeleteAddon}
        title="Delete Add-On"
        message={`Remove "${deletingAddon?.name}" from the add-on library? Products already using it won't be affected.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
