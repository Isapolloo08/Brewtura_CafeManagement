import React, { useState, useRef, useEffect } from 'react';

export function AddonPicker({ title, subtitle, options, selected, onChange, placeholder = 'Search add-ons...', noResultsText = 'No add-ons found' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selectedIds = new Set((selected || []).map(s => String(s.id)));
  const available = (options || []).filter(o => !selectedIds.has(String(o.id)));
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

  const addAddon = (opt) => {
    onChange([...(selected || []), { id: opt.id, name: opt.name, price: parseFloat(opt.price) || 0 }]);
    setSearch('');
    setIsOpen(false);
  };

  const removeAddon = (idx) => {
    onChange((selected || []).filter((_, i) => i !== idx));
  };

  return (
    <div ref={ref} className="pt-3 border-t border-amber-900/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs text-[#3C2A21] flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                    key={o.id}
                    type="button"
                    onClick={() => addAddon(o)}
                    className="w-full text-left px-3 py-2 text-xs text-[#3C2A21] hover:bg-amber-900/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold">{o.name}</span>
                    {(parseFloat(o.price) || 0) > 0 && (
                      <span className="text-[10px] font-bold text-amber-900/50 whitespace-nowrap">
                        +${(parseFloat(o.price) || 0).toFixed(2)}
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
          No add-ons added. Search above and click to add.
        </p>
      ) : (
        <div className="space-y-2">
          {(selected || []).map((a, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-900/5 border border-amber-900/10 text-[#3C2A21]">
                {a.name}
                {(parseFloat(a.price) || 0) > 0 && (
                  <span className="text-[10px] font-bold text-amber-900/50 ml-1.5">
                    (+${(parseFloat(a.price) || 0).toFixed(2)})
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => removeAddon(idx)}
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
