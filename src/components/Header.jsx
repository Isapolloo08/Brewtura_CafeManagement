import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

const fallbackAvatar = (name) => {
  const initial = (name || 'U').charAt(0).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#C08552"/><text x="16" y="21" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFDF9" text-anchor="middle">${initial}</text></svg>`
  )}`;
};

export function Header({ currentUser, onSwitchRole, activeTab, onOpenNewProductModal, onToggleMobileMenu, onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.isMaximized().then(setIsMaximized);
    window.electronAPI.onMaximizedChange(setIsMaximized);
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  return (
    <header
      className="fixed top-0 left-0 lg:left-64 right-0 z-20"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div
        className={`flex items-center justify-between px-4 sm:px-8 py-3.5 transition-all duration-500 ease-out
          ${scrolled
            ? 'bg-[#FFFDF9]/80 backdrop-blur-xl border-b border-amber-900/10 shadow-sm'
            : 'bg-transparent backdrop-blur-0 border-b border-transparent shadow-none'
          }`}
      >
        {/* Mobile Menu Toggle & Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={onToggleMobileMenu}
            className={`lg:hidden p-2 rounded-xl font-bold text-lg hover:bg-amber-900/20 transition-all duration-500 ${scrolled ? 'bg-amber-900/10 text-[#3C2A21]' : 'bg-white/30 text-[#3C2A21]/70'}`}
          >
            ☰
          </button>

          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8A5A34] z-10">
              <Icons.Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search settings..."
              className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl text-[#3C2A21] placeholder-[#8A5A34]/70 focus:ring-2 focus:ring-[#C08552] transition-all duration-500
                ${scrolled ? 'glass-input' : 'bg-white/60 border border-white/50'}`}
            />
          </div>
        </div>

        {/* Nav links, notifications, profile */}
        <div className="flex items-center gap-6" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Text nav links */}
          <nav className="hidden md:flex items-center gap-5">
            <button onClick={() => onNavigate && onNavigate('live_view')} className={`text-xs font-semibold hover:text-[#3C2A21] transition-all duration-500 ${scrolled ? 'text-[#3C2A21]/80' : 'text-[#3C2A21]/50'}`}>
              Live View
            </button>
            <button onClick={() => onNavigate && onNavigate('shift_log')} className={`text-xs font-semibold hover:text-[#3C2A21] transition-all duration-500 ${scrolled ? 'text-[#3C2A21]/80' : 'text-[#3C2A21]/50'}`}>
              Shift Log
            </button>
          </nav>

          {/* Icon buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate && onNavigate('notifications')}
              className={`relative p-2 rounded-full hover:bg-amber-900/10 transition-all duration-500 ${scrolled ? 'text-[#3C2A21]/70' : 'text-[#3C2A21]/40'}`}
              aria-label="Notifications"
            >
              <Icons.Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#C08552]" />
            </button>
            <button
              onClick={() => onNavigate && onNavigate('activity_history')}
              className={`p-2 rounded-full hover:bg-amber-900/10 transition-all duration-500 ${scrolled ? 'text-[#3C2A21]/70' : 'text-[#3C2A21]/40'}`}
              aria-label="Activity history"
            >
              <Icons.History className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className={`hidden md:block w-px h-8 transition-all duration-500 ${scrolled ? 'bg-amber-900/10' : 'bg-amber-900/5'}`} />

          {/* User profile — click to open Profile page */}
          <button
            onClick={() => onNavigate && onNavigate('profile')}
            className="flex items-center gap-2.5 rounded-2xl px-2 py-1 -mx-2 -my-1 hover:bg-amber-900/8 transition-all duration-200 group"
            title="View my profile"
          >
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className={`text-xs font-bold transition-colors duration-500 ${scrolled ? 'text-[#3C2A21]' : 'text-[#3C2A21]/60'}`}>{currentUser?.name ?? 'Julian Costa'}</span>
              <span className={`text-[10px] font-medium transition-colors duration-500 ${scrolled ? 'text-amber-900/55' : 'text-amber-900/30'}`}>{currentUser?.role ?? 'Store Manager'}</span>
            </div>
            <img
              src={currentUser?.avatar || currentUser?.avatarUrl || fallbackAvatar(currentUser?.name)}
              alt={currentUser?.name ?? 'User avatar'}
              onError={e => { e.currentTarget.src = fallbackAvatar(currentUser?.name); }}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/70 shadow-sm group-hover:ring-[#C08552]/60 transition-all duration-200"
              style={{ imageRendering: 'high-quality' }}
            />
          </button>


          {/* Window controls */}
          <div className="flex items-center -mr-2 sm:-mr-4 ml-2">
            <button onClick={handleMinimize} className="p-2 hover:bg-amber-900/10 rounded-lg text-[#3C2A21]/50 hover:text-[#3C2A21] transition-colors" aria-label="Minimize">
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="6" x2="10" y2="6" /></svg>
            </button>
            <button onClick={handleMaximize} className="p-2 hover:bg-amber-900/10 rounded-lg text-[#3C2A21]/50 hover:text-[#3C2A21] transition-colors" aria-label={isMaximized ? 'Restore' : 'Maximize'}>
              {isMaximized ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2.5" y="4.5" width="5" height="5" rx="0.5" />
                  <path d="M4.5 4.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="0.5" />
                </svg>
              )}
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-red-500/10 rounded-lg text-[#3C2A21]/50 hover:text-red-600 transition-colors" aria-label="Close">
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="3" x2="9" y2="9" /><line x1="9" y1="3" x2="3" y2="9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
