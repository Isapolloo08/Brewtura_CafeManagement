import React, { useState } from 'react';
import { Icons } from './Icons';
import { canAccessPage, normalizeRole } from '../utils/permissions.js';
import brandLogo from '../assets/Brewtura_Logo.png';

const fallbackAvatar = (name) => {
  const initial = (name || 'U').charAt(0).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="#C08552"/><text x="18" y="24" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#FFFDF9" text-anchor="middle">${initial}</text></svg>`
  )}`;
};

export function Sidebar({ activeTab, setActiveTab, activeSubTab, onSelectSubItem, currentUser, onLogout, lowStockCount, isMobileOpen, setIsMobileOpen }) {
  const [expandedItems, setExpandedItems] = useState(() => {
    const initial = {};
    ['menu', 'inventory', 'reports', 'settings'].forEach(id => { initial[id] = false; });
    return initial;
  });

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
    {
      id: 'menu',
      label: 'Menu Management',
      icon: Icons.CoffeeCup,
      children: [
        { id: 'categories', label: 'Categories', icon: Icons.Folder },
        { id: 'products', label: 'Products', icon: Icons.Package },
        { id: 'customizations', label: 'Customizations', icon: Icons.Shuffle },
        { id: 'recipes', label: 'Recipes', icon: Icons.Flask },
      ]
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Icons.Inventory,
      badge: lowStockCount > 0 ? lowStockCount : null,
      children: [
        { id: 'ingredients', label: 'Ingredients', icon: Icons.Sprout },
        { id: 'stock_movements', label: 'Stock Movements', icon: Icons.ArrowUpDown },
        { id: 'purchase_orders', label: 'Purchase Orders', icon: Icons.Clipboard },
        { id: 'suppliers', label: 'Suppliers', icon: Icons.Truck },
      ]
    },
    { id: 'kitchen', label: 'Kitchen Display', icon: Icons.Kitchen },
    { id: 'transactions', label: 'Transactions', icon: Icons.Transactions },
    {
      id: 'reports',
      label: 'Reports',
      icon: Icons.Reports,
      children: [
        { id: 'sales', label: 'Sales', icon: Icons.ChartBar },
        { id: 'best_sellers', label: 'Best Sellers', icon: Icons.Star },
        { id: 'inventory', label: 'Inventory', icon: Icons.Scale },
        { id: 'shift_reports', label: 'Shift Reports', icon: Icons.Clock },
      ]
    },
    { id: 'users', label: 'Staff Management', icon: Icons.Users },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Icons.Settings,
      children: [
        { id: 'branches', label: 'Branches', icon: Icons.Truck },
        { id: 'tax_vat', label: 'Tax & VAT', icon: Icons.Percent },
        { id: 'receipt_layout', label: 'Receipt Layout', icon: Icons.Receipt },
        { id: 'branding', label: 'Store Branding', icon: Icons.CoffeeCup },
        { id: 'hardware_printers', label: 'Hardware Printers', icon: Icons.Printer },
        { id: 'payment_gateways', label: 'Payment Gateways', icon: Icons.CreditCard },
        { id: 'communications', label: 'Communications', icon: Icons.MessageSquare },
        { id: 'database_backup', label: 'Database Backup', icon: Icons.Database },
      ]
    },
  ];

  // Only keep pages/sub-pages the signed-in role is allowed to open.
  const role = normalizeRole(currentUser?.role);
  const visibleNavItems = navItems
    .map((item) => {
      if (!item.children) return canAccessPage(role, item.id) ? item : null;
      const children = item.children.filter((child) => canAccessPage(role, item.id, child.id));
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      <aside className={`w-64 glass-sidebar flex flex-col justify-between p-4 fixed top-0 left-0 h-screen z-40 select-none border-r border-amber-900/10 transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Logo & Header (fixed top) */}
          <div className="flex items-center justify-between px-3 py-4 border-b border-amber-900/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-amber-950/20 border border-amber-500/20 flex items-center justify-center bg-white">
                <img src={brandLogo} alt="Brewtura" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="font-heading font-extrabold text-lg text-[#3C2A21] leading-tight tracking-tight">Brewtura</h1>
                <p className="text-[11px] font-semibold text-amber-900/60 uppercase tracking-widest">Admin Terminal</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1 text-amber-900/60 hover:text-[#3C2A21] font-bold text-xl"
            >
              ✕
            </button>
          </div>

          {/* Navigation Section (scrollable) */}
          <nav className="space-y-1 flex-1 overflow-y-auto min-h-0 py-3">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const IconComp = item.icon;
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.children) toggleExpand(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${isActive
                        ? 'bg-[#3C2A21] text-amber-100 shadow-md shadow-amber-950/20'
                        : 'text-[#4A2E2A]/80 hover:bg-amber-900/10 hover:text-[#3C2A21]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-amber-200' : 'text-[#693F27]'}`} title={item.label} />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-600 text-white animate-pulse shadow-sm">
                          {item.badge}
                        </span>
                      )}
                      {item.children && (
                        <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedItems[item.id] ? 'rotate-180' : ''} ${isActive ? 'text-amber-200' : 'text-[#693F27]'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Animated Sub-items Dropdown */}
                  {item.children && (
                    <div className={`ml-9 pl-2.5 border-l-2 border-[#C08552]/40 overflow-hidden transition-all duration-300 ease-in-out ${expandedItems[item.id] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                      {expandedItems[item.id] && (
                        <div className="space-y-1 py-1">
                          {item.children.map((sub, idx) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeSubTab === sub.label.toLowerCase().replace(/[\s&]+/g, '_') ||
                              activeSubTab === sub.label.toLowerCase() ||
                              activeSubTab === sub.label;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onSelectSubItem && onSelectSubItem(item.id, sub.label)}
                                className={`w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 group hover:translate-x-0.5 active:scale-[0.97] animate-submenu-in ${isSubActive
                                    ? 'bg-[#C08552]/20 text-[#3C2A21] font-bold'
                                    : 'text-[#4A2E2A]/70 hover:text-[#3C2A21] hover:bg-amber-900/5'
                                  }`}
                                style={{ animationDelay: `${idx * 50}ms` }}
                              >
                                <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-[#693F27] ${isSubActive
                                    ? 'text-[#693F27] scale-110 animate-icon-pop'
                                    : 'text-[#4A2E2A]/50'
                                  }`} title={sub.label} />
                                <span>{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Actions Footer (fixed bottom) */}
        <div className="pt-4 border-t border-amber-900/10 space-y-3 shrink-0">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFFDF9]/60 backdrop-blur-sm border border-amber-900/10 shadow-sm">
            <img
              src={currentUser?.avatar || fallbackAvatar(currentUser?.name)}
              alt={currentUser?.name || 'User'}
              onError={e => { e.currentTarget.src = fallbackAvatar(currentUser?.name); }}
              className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-[#C08552]/40"
              style={{ imageRendering: 'high-quality' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#3C2A21] truncate">{currentUser?.name || 'Marco V.'}</p>
              <span className="inline-block px-1.5 py-0.2 text-[10px] font-semibold bg-amber-200/60 text-[#693F27] rounded-md">
                {currentUser?.role || 'Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-700 hover:bg-red-500/10 transition-colors border border-red-200/40"
          >
            <Icons.Logout className="w-4 h-4 text-red-600" title="Logout of System" />
            <span>Logout System</span>
          </button>
        </div>
      </aside>
    </>
  );
}
