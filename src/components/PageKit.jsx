import React from 'react';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';

/* ============================================================
   PageKit — shared presentation primitives for admin pages.
   Pure UI: no data fetching, no domain logic. Keeps the
   coffee/latte palette and glass surfaces consistent.
   ============================================================ */

const TONES = {
  coffee: {
    grad: 'from-[#693F27] to-[#3C2A21]',
    text: 'text-[#693F27]',
    soft: 'bg-amber-900/[0.07]',
    ring: 'border-amber-900/12',
    bar: 'from-[#C08552] to-[#693F27]',
    dot: 'bg-[#693F27]',
  },
  amber: {
    grad: 'from-amber-500 to-amber-700',
    text: 'text-amber-800',
    soft: 'bg-amber-500/12',
    ring: 'border-amber-500/25',
    bar: 'from-amber-400 to-amber-600',
    dot: 'bg-amber-500',
  },
  emerald: {
    grad: 'from-emerald-500 to-emerald-700',
    text: 'text-emerald-800',
    soft: 'bg-emerald-500/12',
    ring: 'border-emerald-500/25',
    bar: 'from-emerald-400 to-emerald-600',
    dot: 'bg-emerald-500',
  },
  red: {
    grad: 'from-red-500 to-rose-700',
    text: 'text-red-800',
    soft: 'bg-red-500/10',
    ring: 'border-red-500/25',
    bar: 'from-red-400 to-rose-600',
    dot: 'bg-red-500',
  },
  sky: {
    grad: 'from-sky-500 to-sky-700',
    text: 'text-sky-800',
    soft: 'bg-sky-500/12',
    ring: 'border-sky-500/25',
    bar: 'from-sky-400 to-sky-600',
    dot: 'bg-sky-500',
  },
  violet: {
    grad: 'from-violet-500 to-violet-700',
    text: 'text-violet-800',
    soft: 'bg-violet-500/12',
    ring: 'border-violet-500/25',
    bar: 'from-violet-400 to-violet-600',
    dot: 'bg-violet-500',
  },
};

export const toneOf = (tone) => TONES[tone] || TONES.coffee;

/* ── Page header ─────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, subtitle, icon, children }) {
  return (
    <div className="relative glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-12 w-60 h-60 rounded-full bg-gradient-to-br from-[#C08552]/20 to-transparent blur-2xl"
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#693F27] to-[#3C2A21] flex items-center justify-center text-amber-100 shadow-lg shadow-[#3C2A21]/25">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-[10px] font-extrabold uppercase tracking-[0.14em] mb-2">
                {eyebrow}
              </span>
            )}
            <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21] leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-amber-900/60 font-medium mt-1">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}

/* ── KPI tile ────────────────────────────────────────────── */
export function StatCard({ icon, label, value, sub, tone = 'coffee' }) {
  const t = toneOf(tone);
  return (
    <div className="glass-card rounded-2xl border border-white/60 p-4 flex items-start gap-3.5 hover-lift">
      <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${t.grad} flex items-center justify-center text-white shadow-md`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold text-amber-900/50 uppercase tracking-[0.1em]">{label}</p>
        <p className="font-heading font-extrabold text-xl text-[#3C2A21] leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[10px] text-amber-900/45 font-semibold mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section shell with a titled bar ─────────────────────── */
export function SectionCard({ icon, title, hint, actions, children, bodyClassName = 'p-6', className = '' }) {
  return (
    <div className={`glass-card rounded-3xl border border-white/60 overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-amber-900/10 bg-amber-900/[0.03]">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-[#693F27] shrink-0">{icon}</span>}
          <h3 className="font-heading font-extrabold text-base text-[#3C2A21] truncate">{title}</h3>
          {hint && <span className="hidden md:inline text-[10px] text-amber-900/40 font-bold truncate">{hint}</span>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/* ── Small pills & buttons ───────────────────────────────── */
export function CountPill({ children, tone = 'coffee', className = '' }) {
  const t = toneOf(tone);
  return (
    <span className={`px-2.5 py-1 rounded-full border ${t.soft} ${t.ring} ${t.text} text-[10px] font-extrabold whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({ children, className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`btn-sheen inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-[#4A3227] to-[#2A1B15] text-amber-100 text-xs font-bold shadow-md shadow-[#3C2A21]/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SubtleButton({ children, className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900/[0.07] border border-amber-900/10 text-[#3C2A21] text-xs font-bold hover:bg-amber-900/[0.13] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

const ICON_BTN_TONES = {
  neutral: 'text-amber-900/45 hover:text-[#3C2A21] hover:bg-amber-900/10',
  danger: 'text-red-500/60 hover:text-red-700 hover:bg-red-500/10',
  accent: 'text-[#C08552] hover:text-[#693F27] hover:bg-amber-900/10',
};

export function IconButton({ icon, label, tone = 'neutral', className = '', ...rest }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...rest}
      className={`p-2 rounded-xl transition-colors ${ICON_BTN_TONES[tone] || ICON_BTN_TONES.neutral} ${className}`}
    >
      {icon}
    </button>
  );
}

/* ── Search field ────────────────────────────────────────── */
export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Icons.Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-900/40 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-8 py-2 rounded-xl glass-input text-[11px] font-semibold text-[#3C2A21] placeholder-amber-900/35"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-900/35 hover:text-[#3C2A21] text-xs font-bold transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ── Segmented filter tabs ───────────────────────────────── */
export function FilterTabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${
              active
                ? 'bg-gradient-to-br from-[#4A3227] to-[#2A1B15] text-amber-100 shadow-md shadow-[#3C2A21]/20'
                : 'bg-amber-900/[0.06] text-amber-900/60 hover:bg-amber-900/[0.12] hover:text-[#3C2A21]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tabular-nums ${
                  active ? 'bg-amber-100/20 text-amber-100' : 'bg-amber-900/10 text-[#693F27]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Progress / level bar ────────────────────────────────── */
export function ProgressBar({ pct, tone = 'coffee', className = '', animate = true }) {
  const t = toneOf(tone);
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div className={`w-full h-1.5 rounded-full bg-amber-900/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${t.bar} ${animate ? 'animate-progress-in' : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ── Stock status pill ──────────────────────────────────── */
const STATUS_TONE = {
  'In Stock': 'emerald',
  'Low Stock': 'amber',
  'Out of Stock': 'red',
};

export function StatusPill({ status, className = '' }) {
  const key = STATUS_TONE[status] || 'coffee';
  const t = toneOf(key);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${t.soft} ${t.ring} ${t.text} text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {status}
    </span>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
export function EmptyState({ icon, title, hint, children, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-2 py-14 px-6 ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-amber-900/[0.06] border border-amber-900/10 flex items-center justify-center text-amber-900/30 mb-1">
          {icon}
        </div>
      )}
      <p className="text-sm font-bold text-amber-900/55">{title}</p>
      {hint && <p className="text-xs text-amber-900/35 font-medium max-w-sm">{hint}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

/* ── Table shell (shared header/row rhythm) ─────────────── */
export function TableHead({ columns }) {
  return (
    <thead>
      <tr className="border-b border-amber-900/10 bg-amber-900/[0.04] text-amber-900/50 text-[10px] font-extrabold uppercase tracking-[0.1em]">
        {columns.map((col, i) => (
          <th
            key={col.key || col.label || i}
            className={`py-3 px-4 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.className || ''}`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
export function Pagination({ page, pageSize, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-amber-900/10 bg-amber-900/[0.03]">
      <p className="text-[11px] text-amber-900/50 font-semibold tabular-nums">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <SubtleButton type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="!px-3 !py-1.5">
          ← Prev
        </SubtleButton>
        <span className="text-[11px] font-extrabold text-[#3C2A21] px-1 tabular-nums">
          {page} / {totalPages}
        </span>
        <SubtleButton type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="!px-3 !py-1.5">
          Next →
        </SubtleButton>
      </div>
    </div>
  );
}

/* ── Modal shell ─────────────────────────────────────────── */
export function ModalShell({ title, subtitle, icon, onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1B15]/55 backdrop-blur-md animate-fadeIn">
        <div
          className={`w-full ${maxWidth} glass-card rounded-3xl border border-white/60 text-[#3C2A21] animate-scaleIn max-h-[90vh] flex flex-col overflow-hidden`}
        >
          <div className="flex items-start justify-between gap-3 px-6 py-4 bg-gradient-to-r from-[#3C2A21] to-[#693F27] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <span className="w-9 h-9 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-amber-200">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="font-heading font-extrabold text-lg text-white leading-tight truncate">{title}</h3>
                {subtitle && <p className="text-[11px] text-amber-200/75 font-medium truncate">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 shrink-0 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

/* ── Form field label + hint ─────────────────────────────── */
export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-extrabold text-[#4A2E2A] uppercase tracking-[0.1em] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-amber-900/45 font-medium mt-1.5">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21] placeholder-amber-900/30';

/* ── Inline error banner ─────────────────────────────────── */
export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
      <svg className="w-4 h-4 text-red-600 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.5m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-xs font-semibold text-red-700">{children}</p>
    </div>
  );
}

/* ── Modal footer actions ────────────────────────────────── */
export function ModalActions({ onCancel, cancelLabel = 'Cancel', submitLabel, saving, savingLabel = 'Saving...', disabled }) {
  return (
    <div className="flex gap-2 pt-2">
      <SubtleButton type="button" onClick={onCancel} className="flex-1 !py-2.5">
        {cancelLabel}
      </SubtleButton>
      <PrimaryButton type="submit" disabled={saving || disabled} className="flex-1 !py-2.5">
        {saving ? savingLabel : submitLabel}
      </PrimaryButton>
    </div>
  );
}
