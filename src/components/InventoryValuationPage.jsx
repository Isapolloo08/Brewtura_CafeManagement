import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import {
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

const PAGE_SIZE = 25;

const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const money = (v) => `$${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (v) => num(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const pct = (v) => `${num(v).toFixed(1)}%`;

/* DB rows carry snake_case keys as names ("almond_milk"). */
const titleize = (s) =>
  String(s || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || '—';

/* Risk mirrors the stock status, derived from numbers when the status
   string is missing so a half-mapped row can't read as "Normal". */
const riskOf = (ing) => {
  const stock = num(ing.stock);
  if (ing.status === 'Out of Stock' || stock <= 0) return 'High Risk';
  if (ing.status === 'Low Stock' || stock <= num(ing.minStock)) return 'Watch';
  return 'Normal';
};

const RISK_TONE = { Normal: 'emerald', Watch: 'amber', 'High Risk': 'red' };

/* Monochrome ramp — keeps the ABC class visually distinct from the
   emerald/amber/red risk colors in the neighbouring column. */
const CLASS_STYLE = {
  A: 'bg-[#693F27] border-[#693F27] text-amber-50',
  B: 'bg-amber-900/[0.12] border-amber-900/15 text-[#693F27]',
  C: 'bg-amber-900/[0.04] border-amber-900/10 text-amber-900/45',
};

function RiskPill({ risk }) {
  const t = toneOf(RISK_TONE[risk] || 'coffee');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${t.soft} ${t.ring} ${t.text} text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {risk}
    </span>
  );
}

function ClassBadge({ klass }) {
  return (
    <span
      title={`Class ${klass}`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg border text-[10px] font-extrabold ${CLASS_STYLE[klass]}`}
    >
      {klass}
    </span>
  );
}

export function InventoryValuationPage({ ingredients = [] }) {
  /* Captured once so the audit stamp doesn't drift while filtering. */
  const [asOf] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);

  /* Ranked by asset value, then ABC-classified on cumulative share:
     A covers the first 80% of value, B the next 15%, C the tail. */
  const rows = useMemo(() => {
    const valued = ingredients
      .map((ing) => ({
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        stock: num(ing.stock),
        cost: num(ing.costPerUnit),
        value: num(ing.stock) * num(ing.costPerUnit),
        risk: riskOf(ing),
      }))
      .sort((a, b) => b.value - a.value);

    const total = valued.reduce((s, r) => s + r.value, 0);
    let cumulative = 0;

    return valued.map((r) => {
      const startPct = total > 0 ? (cumulative / total) * 100 : 100;
      cumulative += r.value;
      return {
        ...r,
        share: total > 0 ? (r.value / total) * 100 : 0,
        klass: startPct < 80 ? 'A' : startPct < 95 ? 'B' : 'C',
      };
    });
  }, [ingredients]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.value, 0);
    const flagged = rows.filter((r) => r.risk !== 'Normal');
    const classA = rows.filter((r) => r.klass === 'A');
    return {
      total,
      atRisk: flagged.reduce((s, r) => s + r.value, 0),
      atRiskCount: flagged.length,
      top: rows[0] || null,
      classACount: classA.length,
      classAShare: total > 0 ? (classA.reduce((s, r) => s + r.value, 0) / total) * 100 : 0,
      counts: {
        Normal: rows.filter((r) => r.risk === 'Normal').length,
        Watch: rows.filter((r) => r.risk === 'Watch').length,
        'High Risk': rows.filter((r) => r.risk === 'High Risk').length,
      },
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (riskFilter !== 'all' && r.risk !== riskFilter) return false;
      if (!q) return true;
      return `${r.name} ${titleize(r.name)} ${r.unit}`.toLowerCase().includes(q);
    });
  }, [rows, riskFilter, search]);

  const filteredTotal = filtered.reduce((s, r) => s + r.value, 0);
  const isFiltered = riskFilter !== 'all' || search.trim() !== '';

  /* Clamp: the stored page can outlive a shrinking list. */
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = (fn) => (val) => {
    setPage(1);
    fn(val);
  };

  const tabs = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'Normal', label: 'Normal', count: stats.counts.Normal },
    { id: 'Watch', label: 'Watch', count: stats.counts.Watch },
    { id: 'High Risk', label: 'High Risk', count: stats.counts['High Risk'] },
  ];

  const asOfLabel = asOf.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Icons.Scale className="w-5 h-5" />}
          label="Total Asset Value"
          value={money(stats.total)}
          sub={`${rows.length.toLocaleString()} item${rows.length === 1 ? '' : 's'} valued`}
          tone="emerald"
        />
        <StatCard
          icon={<Icons.Bell className="w-5 h-5" />}
          label="Value At Risk"
          value={money(stats.atRisk)}
          sub={`${stats.atRiskCount} low or out of stock`}
          tone={stats.counts['High Risk'] > 0 ? 'red' : 'amber'}
        />
        <StatCard
          icon={<Icons.Package className="w-5 h-5" />}
          label="Largest Line Item"
          value={stats.top ? money(stats.top.value) : money(0)}
          sub={stats.top ? `${titleize(stats.top.name)} · ${pct(stats.top.share)} of total` : 'No stock on hand'}
          tone="coffee"
        />
        <StatCard
          icon={<Icons.ChartBar className="w-5 h-5" />}
          label="Class A Items"
          value={stats.classACount.toLocaleString()}
          sub={`${pct(stats.classAShare)} of total value`}
          tone="sky"
        />
      </div>

      <SectionCard
        icon={<Icons.Scale className="w-4 h-4" />}
        title="Inventory Valuation"
        hint={`As of ${asOfLabel} · valued at latest unit cost`}
        bodyClassName="p-0"
        actions={
          <>
            <SearchInput
              value={search}
              onChange={resetPage(setSearch)}
              placeholder="Search ingredients..."
              className="w-52"
            />
            <CountPill tone={isFiltered ? 'amber' : 'coffee'}>
              {isFiltered ? `${money(filteredTotal)} shown` : `${money(stats.total)} total`}
            </CountPill>
          </>
        }
      >
        <div className="px-6 pt-4 pb-3 border-b border-amber-900/[0.07] space-y-2.5">
          <FilterTabs tabs={tabs} value={riskFilter} onChange={resetPage(setRiskFilter)} />
          <p className="text-[10px] text-amber-900/40 font-bold leading-relaxed">
            ABC by cumulative value — A = first 80%, B = next 15%, C = remainder ·{' '}
            <span className="text-amber-700">Watch</span> = at or below reorder point ·{' '}
            <span className="text-red-600">High Risk</span> = out of stock
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icons.Scale className="w-6 h-6" />}
            title={rows.length === 0 ? 'Nothing to value yet' : 'No ingredients match your filters'}
            hint={
              rows.length === 0
                ? 'Once ingredients carry stock and a unit cost, their asset value is reported here.'
                : 'Try a different risk band or clear the search.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <TableHead
                  columns={[
                    { label: 'Ingredient' },
                    { label: 'ABC', align: 'center' },
                    { label: 'Stock', align: 'right' },
                    { label: 'Unit Cost', align: 'right' },
                    { label: 'Asset Value', align: 'right' },
                    { label: '% of Total', align: 'right' },
                    { label: 'Risk' },
                  ]}
                />
                <tbody className="divide-y divide-amber-900/[0.07] text-xs font-semibold">
                  {paged.map((r, i) => (
                    <tr key={r.id} className="hover:bg-amber-900/[0.04] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 shrink-0 text-[10px] font-extrabold text-amber-900/30 tabular-nums text-right">
                            {(safePage - 1) * PAGE_SIZE + i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-[#3C2A21] truncate">{titleize(r.name)}</p>
                            <p className="text-[10px] text-amber-900/35 font-semibold truncate">{r.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ClassBadge klass={r.klass} />
                      </td>
                      <td className="py-3 px-4 text-right text-amber-900/70 tabular-nums whitespace-nowrap">
                        {qty(r.stock)} <span className="text-[10px] text-amber-900/45">{r.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-[#3C2A21] tabular-nums whitespace-nowrap">
                        {money(r.cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#693F27] tabular-nums whitespace-nowrap">
                        {money(r.value)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-end gap-1 min-w-[4.5rem]">
                          <span className="text-[10px] font-extrabold text-amber-900/50 tabular-nums">
                            {pct(r.share)}
                          </span>
                          <div className="w-16 h-1 rounded-full bg-amber-900/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#C08552] to-[#693F27]"
                              style={{ width: `${Math.min(100, r.share)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <RiskPill risk={r.risk} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-900/15 bg-amber-900/[0.04] text-xs">
                    <td colSpan={4} className="py-3 px-4 font-extrabold text-[#3C2A21]">
                      {isFiltered ? 'Filtered total' : 'Total'}
                      <span className="ml-2 text-[10px] font-bold text-amber-900/45 tabular-nums">
                        {filtered.length.toLocaleString()} item{filtered.length === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-heading font-extrabold text-sm text-[#3C2A21] tabular-nums whitespace-nowrap">
                      {money(filteredTotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-[10px] font-extrabold text-amber-900/50 tabular-nums">
                      {pct(stats.total > 0 ? (filteredTotal / stats.total) * 100 : 0)}
                    </td>
                    <td className="py-3 px-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </SectionCard>
    </div>
  );
}
