import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import api from '../services/api.js';

export function IngredientPickerModal({ onClose, ingredients, existingItems, onAdd }) {
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

export default IngredientPickerModal;