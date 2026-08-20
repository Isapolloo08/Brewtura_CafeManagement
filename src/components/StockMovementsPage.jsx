import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import {
  PageHeader,
  StatCard,
  SectionCard,
  SearchInput,
  FilterTabs,
  EmptyState,
  TableHead,
  Pagination,
  CountPill,
  toneOf,
} from './PageKit';

const PAGE_SIZE = 20;

/* Movements arrive in two shapes: freshly loaded rows carry the DB enum
   (`stock_in`, `waste`, ...) while optimistic local rows carry the display
   label ("Stock In"). Canonicalize both so the filters, distribution bars
   and badges cover every row. */
const canonicalType = (raw) => {
  const key = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (
    {
      stock_in: 'Stock In',
      stock_out: 'Stock Out',
      waste: 'Waste',
      spoilage: 'Spoilage',
      adjustment: 'Manual Adjustment',
      manual_adjustment: 'Manual Adjustment',
    }[key] || (raw ? String(raw) : 'Unknown')
  );
};

const TYPE_META = {
  'Stock In': { tone: 'emerald', dir: 'in', short: 'In' },
  'Stock Out': { tone: 'sky', dir: 'out', short: 'Out' },
  Spoilage: { tone: 'red', dir: 'out', short: 'Spoil' },
  Waste: { tone: 'red', dir: 'out', short: 'Waste' },
  'Manual Adjustment': { tone: 'amber', dir: 'adj', short: 'Adjust' },
  Unknown: { tone: 'coffee', dir: 'adj', short: '—' },
};

const metaFor = (label) => TYPE_META[label] || TYPE_META.Unknown;

const TYPE_ORDER = ['Stock In', 'Stock Out', 'Spoilage', 'Waste', 'Manual Adjustment'];

const DirGlyph = ({ dir, className = 'w-3 h-3' }) => {
  if (dir === 'in') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
      </svg>
    );
  }
  if (dir === 'out') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l6-6m-6 6l-6-6" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
};

function TypeBadge({ label }) {
  const meta = metaFor(label);
  const t = toneOf(meta.tone);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${t.soft} ${t.ring} ${t.text} text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap`}
    >
      <DirGlyph dir={meta.dir} />
      {label}
    </span>
  );
}

/* "Aug 19, 2026, 3:04:12 PM" → { date, time } */
const splitTimestamp = (ts) => {
  const raw = String(ts || '');
  const cut = raw.lastIndexOf(', ');
  if (cut === -1) return { date: raw || '—', time: '' };
  return { date: raw.slice(0, cut), time: raw.slice(cut + 2) };
};

const initialsOf = (name) =>
  String(name || '?')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

export function StockMovementsPage({ movements }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      (movements || []).map((mov) => {
        const label = canonicalType(mov.type);
        const quantity = String(mov.quantity ?? '');
        return {
          ...mov,
          typeLabel: label,
          meta: metaFor(label),
          isDeduction: quantity.trim().startsWith('-'),
          quantity,
          // App.jsx falls back to `reason: note || type` — hide that echo.
          reasonText: !mov.reason || mov.reason === mov.type ? '' : mov.reason,
        };
      }),
    [movements]
  );

  const counts = useMemo(() => {
    const acc = {};
    rows.forEach((r) => {
      acc[r.typeLabel] = (acc[r.typeLabel] || 0) + 1;
    });
    return acc;
  }, [rows]);

  const stockInCount = counts['Stock In'] || 0;
  const deductionCount = (counts['Stock Out'] || 0) + (counts.Spoilage || 0) + (counts.Waste || 0);
  const adjustmentCount = counts['Manual Adjustment'] || 0;
  const lossCount = (counts.Spoilage || 0) + (counts.Waste || 0);
  const lossPct = rows.length ? Math.round((lossCount / rows.length) * 100) : 0;

  const tabs = useMemo(
    () => [
      { id: 'all', label: 'All', count: rows.length },
      ...TYPE_ORDER.filter((t) => counts[t]).map((t) => ({
        id: t,
        label: metaFor(t).short === '—' ? t : t,
        count: counts[t],
      })),
    ],
    [rows.length, counts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.typeLabel !== typeFilter) return false;
      if (!q) return true;
      return [r.ingredientName, r.reasonText, r.user, r.typeLabel, r.quantity]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [rows, typeFilter, search]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = (fn) => (val) => {
    setPage(1);
    fn(val);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        eyebrow="Audit Trail"
        title="Stock Movements"
        subtitle="Every stock-in, deduction and correction — immutable and attributable."
        icon={<Icons.ArrowUpDown className="w-5 h-5" />}
      >
        <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-900/[0.06] border border-amber-900/10 text-[11px] font-extrabold text-[#693F27]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live history
        </span>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Icons.History className="w-5 h-5" />}
          label="Total Movements"
          value={rows.length.toLocaleString()}
          sub="All recorded entries"
          tone="coffee"
        />
        <StatCard
          icon={<DirGlyph dir="in" className="w-5 h-5" />}
          label="Stock In"
          value={stockInCount.toLocaleString()}
          sub="Receiving events"
          tone="emerald"
        />
        <StatCard
          icon={<DirGlyph dir="out" className="w-5 h-5" />}
          label="Deductions"
          value={deductionCount.toLocaleString()}
          sub={`${lossCount} loss · ${lossPct}% of all`}
          tone="red"
        />
        <StatCard
          icon={<Icons.Scale className="w-5 h-5" />}
          label="Adjustments"
          value={adjustmentCount.toLocaleString()}
          sub="Manual audit corrections"
          tone="amber"
        />
      </div>

      <SectionCard
        icon={<Icons.ChartBar className="w-4 h-4" />}
        title="Movement Mix"
        hint="Share of each movement type"
        actions={<CountPill>{rows.length} movements</CountPill>}
        bodyClassName="p-6"
      >
        {rows.length === 0 ? (
          <p className="text-xs font-semibold text-amber-900/40 text-center py-4">
            No movements recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {TYPE_ORDER.map((type) => {
              const count = counts[type] || 0;
              if (count === 0) return null;
              const pct = Math.round((count / rows.length) * 100);
              const meta = metaFor(type);
              const t = toneOf(meta.tone);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setTypeFilter((cur) => (cur === type ? 'all' : type));
                  }}
                  className={`w-full text-left group rounded-xl px-3 py-2 -mx-1 transition-colors ${
                    typeFilter === type ? 'bg-amber-900/[0.07]' : 'hover:bg-amber-900/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                    <span className="flex items-center gap-1.5 text-[#3C2A21]">
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      {type}
                    </span>
                    <span className="text-amber-900/50 tabular-nums">
                      {count} <span className="text-amber-900/35">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-amber-900/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${t.bar} animate-progress-in`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<Icons.Clipboard className="w-4 h-4" />}
        title="Movement Log"
        hint="Newest first"
        bodyClassName="p-0"
        actions={
          <>
            <SearchInput
              value={search}
              onChange={resetPage(setSearch)}
              placeholder="Ingredient, reason, user..."
              className="w-52"
            />
            <CountPill tone={filtered.length === rows.length ? 'coffee' : 'amber'}>
              {filtered.length} shown
            </CountPill>
          </>
        }
      >
        <div className="px-6 pt-4 pb-3 border-b border-amber-900/[0.07]">
          <FilterTabs tabs={tabs} value={typeFilter} onChange={resetPage(setTypeFilter)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icons.History className="w-6 h-6" />}
            title={rows.length === 0 ? 'No stock movements yet' : 'No movements match your filters'}
            hint={
              rows.length === 0
                ? 'Adjust an ingredient or option stock level and the entry will appear here.'
                : 'Try a different type or clear the search.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <TableHead
                  columns={[
                    { label: 'When' },
                    { label: 'Item' },
                    { label: 'Type' },
                    { label: 'Quantity', align: 'right' },
                    { label: 'Reason' },
                    { label: 'Authorized By' },
                  ]}
                />
                <tbody className="divide-y divide-amber-900/[0.07] text-xs font-semibold">
                  {paged.map((mov) => {
                    const { date, time } = splitTimestamp(mov.timestamp);
                    return (
                      <tr key={mov.id} className="hover:bg-amber-900/[0.04] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-[#3C2A21] font-bold">{date}</p>
                          {time && <p className="text-[10px] text-amber-900/40 font-medium mt-0.5">{time}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 shrink-0 rounded-lg bg-amber-900/[0.07] border border-amber-900/10 flex items-center justify-center text-[#693F27]">
                              <Icons.Package className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-bold text-[#3C2A21]">{mov.ingredientName || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <TypeBadge label={mov.typeLabel} />
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-extrabold tabular-nums whitespace-nowrap ${
                            mov.isDeduction ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {mov.quantity || '—'}
                        </td>
                        <td className="py-3 px-4 text-amber-900/65 font-medium max-w-[16rem]">
                          {mov.reasonText || <span className="text-amber-900/30">No note</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-[#693F27] to-[#3C2A21] text-amber-100 text-[9px] font-extrabold flex items-center justify-center">
                              {initialsOf(mov.user)}
                            </span>
                            <span className="font-bold text-amber-900/70">{mov.user || 'System'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </SectionCard>
    </div>
  );
}
