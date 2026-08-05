import React, { useState, useRef, useEffect } from 'react';

export function CustomizationPicker({ title, subtitle, options, selected, onChange, placeholder = 'Search...', noResultsText = 'No options found' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selectedNames = new Set((selected || []).map(s => s.name));
  const available = (options || []).filter(o => !selectedNames.has(o.name));
  const filtered = available.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const addCustomization = (opt) => {
    onChange([...(selected || []), { name: opt.name, priceDelta: opt.priceDelta }]);
    setSearch('');
    setIsOpen(false);
  };

  const handleDelta = (idx, val) => {
    const updated = [...(selected || [])];
    updated[idx] = { ...updated[idx], priceDelta: parseFloat(val) || 0 };
    onChange(updated);
  };

  const removeCustomization = (idx) => {
    onChange((selected || []).filter((_, i) => i !== idx));
  };

  return (
    <div ref={ref} className="pt-3 border-t border-amber-900/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs text-[#3C2A21] flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {title}
        </h4>
        {subtitle && <span className="text-[10px] font-bold text-amber-900/40">{subtitle}</span>}
      </div>

      <div className="relative">
        <div
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-xl glass-input text-[#3C2A21] cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-amber-900/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-xs text-[#3C2A21]"
          />
          <svg className={`w-3 h-3 text-amber-900/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card rounded-xl border border-white/60 shadow-lg overflow-hidden">
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-amber-900/40 text-center">{noResultsText}</p>
              ) : (
                filtered.map(o => (
                  <button
                    key={o.name}
                    type="button"
                    onClick={() => addCustomization(o)}
                    className="w-full text-left px-3 py-2 text-xs text-[#3C2A21] hover:bg-amber-900/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold">{o.name}</span>
                    {o.priceDelta !== 0 && (
                      <span className="text-[10px] font-bold text-amber-900/50 whitespace-nowrap">
                        {o.priceDelta > 0 ? `+$${o.priceDelta.toFixed(2)}` : `-$${Math.abs(o.priceDelta).toFixed(2)}`}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {(selected || []).length === 0 ? (
        <p className="text-xs text-amber-900/40 font-medium text-center py-2">
          No {title.toLowerCase()} added. Search above and click to add.
        </p>
      ) : (
        <div className="space-y-2">
          {(selected || []).map((v, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-900/5 border border-amber-900/10 text-[#3C2A21]">
                {v.name}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-amber-900/60">+$</span>
                <input
                  type="number"
                  step="0.01"
                  value={v.priceDelta}
                  onChange={(e) => handleDelta(idx, e.target.value)}
                  className="w-20 px-3 py-1.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
                  placeholder="0.00"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCustomization(idx)}
                className="text-red-500/60 hover:text-red-600 font-bold text-sm px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
