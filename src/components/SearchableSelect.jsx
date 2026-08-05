import React, { useState, useRef, useEffect } from 'react';

export function SearchableSelect({ options, value, onChange, placeholder = 'Search...', searchPlaceholder = 'Search...', noResultsText = 'No options found' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-xl glass-input text-[#3C2A21] cursor-pointer"
      >
        <span className={selected ? 'font-semibold' : 'text-amber-900/40'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-3 h-3 text-amber-900/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card rounded-xl border border-white/60 shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-amber-900/10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-[#3C2A21]"
              autoFocus
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-amber-900/40 text-center">{noResultsText}</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                    o.value === value
                      ? 'bg-[#3C2A21] text-amber-100 font-bold'
                      : 'text-[#3C2A21] hover:bg-amber-900/10'
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
