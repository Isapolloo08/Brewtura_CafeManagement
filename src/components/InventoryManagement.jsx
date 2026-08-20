import React, { useMemo } from 'react';
import { Icons } from './Icons';
import {
  PageHeader,
  StatCard,
  SectionCard,
  ProgressBar,
  StatusPill,
  CountPill,
  EmptyState,
  TableHead,
  PrimaryButton,
  SubtleButton,
  toneOf,
} from './PageKit';

const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const money = (v) => `$${num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (v) => num(v).toLocaleString('en-US', { maximumFractionDigits: 2 });

/* One canonical rule for stock status so the KPI tiles, the health bar and
   the reorder list can never disagree — and so an item can only land in a
   single bucket (the old union filters could list the same row twice). */
const statusOf = (ing) => {
  const stock = num(ing.stock);
  if (ing.status === 'Out of Stock' || stock <= 0) return 'Out of Stock';
  if (ing.status === 'Low Stock' || stock <= num(ing.minStock)) return 'Low Stock';
  return 'In Stock';
};

const STATUS_TONE = { 'In Stock': 'emerald', 'Low Stock': 'amber', 'Out of Stock': 'red' };
const PO_TONE = { 'Pending Approval': 'amber', 'In Transit': 'sky', Completed: 'emerald' };

/* Movements carry quantity as a signed display string ("+12 kg" / "-3"). */
const isOutbound = (mov) => String(mov?.quantity ?? '').trim().startsWith('-');

const pctOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

function PoStatusPill({ status }) {
  const t = toneOf(PO_TONE[status] || 'coffee');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${t.soft} ${t.ring} ${t.text} text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {status || 'Unknown'}
    </span>
  );
}

const DirGlyph = ({ out, className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d={out ? 'M12 5v14m0 0l6-6m-6 6l-6-6' : 'M12 19V5m0 0l-6 6m6-6l6 6'}
    />
  </svg>
);

export function InventoryManagement({
  ingredients = [],
  movements = [],
  purchaseOrders = [],
  suppliers = [],
  onNavigate
}) {
  const stats = useMemo(() => {
    const buckets = { 'In Stock': [], 'Low Stock': [], 'Out of Stock': [] };
    let value = 0;
    for (const ing of ingredients) {
      buckets[statusOf(ing)].push(ing);
      value += num(ing.stock) * num(ing.costPerUnit);
    }
    return {
      value,
      healthy: buckets['In Stock'].length,
      low: buckets['Low Stock'].length,
      out: buckets['Out of Stock'].length,
      total: ingredients.length,
    };
  }, [ingredients]);

  /* Reorder queue: empty shelves first, then whatever is closest to running
     out relative to its own reorder point. */
  const reorderQueue = useMemo(
    () =>
      ingredients
        .map((ing) => {
          const status = statusOf(ing);
          const stock = num(ing.stock);
          const min = num(ing.minStock);
          return {
            ...ing,
            status,
            stock,
            min,
            coverage: min > 0 ? stock / min : stock > 0 ? 1 : 0,
          };
        })
        .filter((ing) => ing.status !== 'In Stock')
        .sort((a, b) => a.coverage - b.coverage || a.stock - b.stock),
    [ingredients]
  );

  /* The ingredients mapper stamps every row with category "General", so the
     old category breakdown always rendered one 100% bar. Value concentration
     answers the same question ("where is the money parked?") with real data. */
  const concentration = useMemo(() => {
    const ranked = ingredients
      .map((ing) => ({ id: ing.id, name: ing.name, unit: ing.unit, stock: num(ing.stock), value: num(ing.stock) * num(ing.costPerUnit) }))
      .filter((ing) => ing.value > 0)
      .sort((a, b) => b.value - a.value);
    const top = ranked.slice(0, 6);
    const rest = ranked.slice(6);
    return { top, restCount: rest.length, restValue: rest.reduce((s, i) => s + i.value, 0) };
  }, [ingredients]);

  const openOrders = useMemo(() => {
    const open = purchaseOrders.filter((po) => po.status !== 'Completed');
    return {
      list: open.sort((a, b) => String(a.expectedDelivery || '').localeCompare(String(b.expectedDelivery || ''))),
      value: open.reduce((s, po) => s + num(po.totalCost), 0),
      inTransit: open.filter((po) => po.status === 'In Transit').length,
    };
  }, [purchaseOrders]);

  const recentMovements = movements.slice(0, 5);

  const health = [
    { label: 'In Stock', count: stats.healthy, tone: 'emerald' },
    { label: 'Low Stock', count: stats.low, tone: 'amber' },
    { label: 'Out of Stock', count: stats.out, tone: 'red' },
  ].map((s) => ({ ...s, pct: pctOf(s.count, stats.total) }));

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        eyebrow="Warehouse Operations"
        title="Inventory Overview"
        subtitle="Stock levels, supplier coordination and asset valuation at a glance."
        icon={<Icons.Inventory className="w-5 h-5" />}
      >
        <PrimaryButton onClick={() => onNavigate('inventory', 'ingredients')} className="!px-4 !py-2.5">
          <Icons.Sprout className="w-4 h-4" /> Manage Stock
        </PrimaryButton>
        <SubtleButton onClick={() => onNavigate('inventory', 'purchase_orders')} className="!py-2.5">
          <Icons.Clipboard className="w-4 h-4" /> Purchase Orders
        </SubtleButton>
        <SubtleButton onClick={() => onNavigate('inventory', 'suppliers')} className="!py-2.5">
          <Icons.Truck className="w-4 h-4" /> Suppliers
        </SubtleButton>
      </PageHeader>

      {(stats.out > 0 || stats.low > 0) && (
        <div
          className={`glass-card rounded-3xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
            stats.out > 0 ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-amber-500/25 bg-amber-500/[0.04]'
          }`}
        >
          <div
            className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${
              toneOf(stats.out > 0 ? 'red' : 'amber').grad
            }`}
          >
            <Icons.Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-extrabold text-sm text-[#3C2A21]">
              {stats.out > 0
                ? `${stats.out} ingredient${stats.out === 1 ? '' : 's'} out of stock`
                : `${stats.low} ingredient${stats.low === 1 ? '' : 's'} below reorder point`}
              {stats.out > 0 && stats.low > 0 && (
                <span className="text-amber-900/55 font-bold"> · {stats.low} more running low</span>
              )}
            </p>
            <p className="text-[11px] text-amber-900/60 font-semibold truncate mt-0.5">
              {reorderQueue.slice(0, 3).map((i) => i.name).join(' · ')}
              {reorderQueue.length > 3 && ` · +${reorderQueue.length - 3} more`}
            </p>
          </div>
          <SubtleButton onClick={() => onNavigate('inventory', 'purchase_orders')} className="shrink-0 !py-2.5">
            <Icons.Plus className="w-4 h-4" /> Raise Purchase Order
          </SubtleButton>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<Icons.Package className="w-5 h-5" />}
          label="Tracked Items"
          value={stats.total.toLocaleString()}
          sub={`${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'} on file`}
          tone="coffee"
        />
        <StatCard
          icon={<Icons.Scale className="w-5 h-5" />}
          label="Inventory Value"
          value={money(stats.value)}
          sub="Stock × unit cost"
          tone="emerald"
        />
        <StatCard
          icon={<Icons.ArrowUpDown className="w-5 h-5" />}
          label="Low Stock"
          value={stats.low.toLocaleString()}
          sub="At or below reorder point"
          tone="amber"
        />
        <StatCard
          icon={<Icons.Inventory className="w-5 h-5" />}
          label="Out of Stock"
          value={stats.out.toLocaleString()}
          sub="Blocking production"
          tone="red"
        />
        <StatCard
          icon={<Icons.Truck className="w-5 h-5" />}
          label="Open Orders"
          value={openOrders.list.length.toLocaleString()}
          sub={`${money(openOrders.value)} inbound`}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          className="lg:col-span-2"
          icon={<Icons.ChartBar className="w-4 h-4" />}
          title="Stock Value Concentration"
          hint="Share of total asset value"
          actions={<CountPill>{money(stats.value)} total</CountPill>}
        >
          {concentration.top.length === 0 ? (
            <EmptyState
              icon={<Icons.Scale className="w-6 h-6" />}
              title="No stock value to report"
              hint="Once ingredients carry stock and a unit cost, their share of inventory value shows up here."
            />
          ) : (
            <div className="space-y-4">
              {concentration.top.map((ing, i) => {
                const share = pctOf(ing.value, stats.value);
                return (
                  <div key={ing.id}>
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 shrink-0 rounded-lg bg-amber-900/[0.07] border border-amber-900/10 flex items-center justify-center text-[9px] font-extrabold text-[#693F27] tabular-nums">
                          {i + 1}
                        </span>
                        <p className="text-xs font-bold text-[#3C2A21] truncate">{ing.name}</p>
                        <span className="hidden sm:inline text-[10px] text-amber-900/40 font-semibold whitespace-nowrap tabular-nums">
                          {qty(ing.stock)} {ing.unit}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-[#693F27] tabular-nums">{money(ing.value)}</span>
                        <span className="text-[10px] font-bold text-amber-900/40 tabular-nums w-10 text-right">
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar pct={share} tone="coffee" />
                  </div>
                );
              })}
              {concentration.restCount > 0 && (
                <p className="text-[10px] font-bold text-amber-900/40 pt-1 tabular-nums">
                  +{concentration.restCount} other item{concentration.restCount === 1 ? '' : 's'} ·{' '}
                  {money(concentration.restValue)}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={<Icons.Percent className="w-4 h-4" />} title="Stock Health">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="font-heading font-extrabold text-3xl text-[#3C2A21] leading-none tabular-nums">
                {Math.round(pctOf(stats.healthy, stats.total))}%
              </p>
              <p className="text-[10px] font-extrabold text-amber-900/45 uppercase tracking-[0.1em] mt-1.5">
                At healthy levels
              </p>
            </div>
            <CountPill tone={stats.out > 0 ? 'red' : stats.low > 0 ? 'amber' : 'emerald'}>
              {stats.out > 0 ? 'Action needed' : stats.low > 0 ? 'Monitor' : 'All clear'}
            </CountPill>
          </div>

          <div className="flex h-2.5 gap-0.5 rounded-full bg-amber-900/10 overflow-hidden">
            {health
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.label}
                  title={`${s.label}: ${s.count}`}
                  className={`h-full bg-gradient-to-r ${toneOf(s.tone).bar} animate-progress-in`}
                  style={{ width: `${s.pct}%` }}
                />
              ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {health.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 font-semibold text-amber-900/65 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${toneOf(s.tone).dot}`} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="flex items-baseline gap-2 shrink-0">
                  <span className="font-extrabold text-[#3C2A21] tabular-nums">{s.count}</span>
                  <span className="text-[10px] font-bold text-amber-900/40 tabular-nums w-9 text-right">
                    {Math.round(s.pct)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          icon={<Icons.Bell className="w-4 h-4" />}
          title="Reorder Priority"
          actions={
            <>
              {reorderQueue.length > 0 && (
                <CountPill tone={stats.out > 0 ? 'red' : 'amber'}>{reorderQueue.length} flagged</CountPill>
              )}
              <SubtleButton onClick={() => onNavigate('inventory', 'ingredients')} className="!px-3 !py-1.5">
                View All
              </SubtleButton>
            </>
          }
        >
          {reorderQueue.length === 0 ? (
            <EmptyState
              icon={<Icons.Sprout className="w-6 h-6" />}
              title="Every ingredient is well stocked"
              hint="Nothing has dropped to its reorder point."
            />
          ) : (
            <div className="space-y-2.5">
              {reorderQueue.slice(0, 5).map((item) => {
                const t = toneOf(STATUS_TONE[item.status]);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#FFFDF9]/70 border border-amber-900/10 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-9 h-9 shrink-0 rounded-xl border ${t.soft} ${t.ring} ${t.text} flex items-center justify-center`}
                        >
                          {item.status === 'Out of Stock' ? (
                            <Icons.Inventory className="w-4 h-4" />
                          ) : (
                            <Icons.ArrowUpDown className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#3C2A21] truncate">{item.name}</p>
                          <p className="text-[10px] text-amber-900/50 font-semibold tabular-nums">
                            {qty(item.stock)} {item.unit} on hand · reorder at {qty(item.min)} {item.unit}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    <ProgressBar pct={Math.min(100, item.coverage * 100)} tone={STATUS_TONE[item.status]} className="mt-2.5" />
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={<Icons.History className="w-4 h-4" />}
          title="Recent Movements"
          actions={
            <SubtleButton onClick={() => onNavigate('inventory', 'stock_movements')} className="!px-3 !py-1.5">
              View All
            </SubtleButton>
          }
        >
          {recentMovements.length === 0 ? (
            <EmptyState
              icon={<Icons.ArrowUpDown className="w-6 h-6" />}
              title="No stock movements yet"
              hint="Stock-ins, waste and recipe deductions land here as they happen."
            />
          ) : (
            <div className="space-y-2.5">
              {recentMovements.map((mov) => {
                const out = isOutbound(mov);
                const t = toneOf(out ? 'red' : 'emerald');
                return (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFFDF9]/70 border border-amber-900/10 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-9 h-9 shrink-0 rounded-xl border ${t.soft} ${t.ring} ${t.text} flex items-center justify-center`}
                      >
                        <DirGlyph out={out} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#3C2A21] truncate">{mov.ingredientName}</p>
                        <p className="text-[10px] text-amber-900/50 font-semibold truncate">{mov.reason}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-extrabold tabular-nums ${out ? 'text-red-700' : 'text-emerald-700'}`}>
                        {mov.quantity}
                      </p>
                      <p className="text-[10px] text-amber-900/40 font-semibold whitespace-nowrap">{mov.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        icon={<Icons.Truck className="w-4 h-4" />}
        title="Incoming Deliveries"
        hint="Purchase orders awaiting fulfillment"
        bodyClassName="p-0"
        actions={
          <>
            {openOrders.inTransit > 0 && <CountPill tone="sky">{openOrders.inTransit} in transit</CountPill>}
            <SubtleButton onClick={() => onNavigate('inventory', 'purchase_orders')} className="!px-3 !py-1.5">
              Manage Orders
            </SubtleButton>
          </>
        }
      >
        {openOrders.list.length === 0 ? (
          <EmptyState
            icon={<Icons.Clipboard className="w-6 h-6" />}
            title="No open purchase orders"
            hint="Raise an order to restock ingredients from a supplier."
          >
            <SubtleButton onClick={() => onNavigate('inventory', 'purchase_orders')}>
              <Icons.Plus className="w-4 h-4" /> New Purchase Order
            </SubtleButton>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <TableHead
                columns={[
                  { label: 'Order' },
                  { label: 'Supplier' },
                  { label: 'Expected' },
                  { label: 'Items', align: 'right' },
                  { label: 'Value', align: 'right' },
                  { label: 'Status' },
                ]}
              />
              <tbody className="divide-y divide-amber-900/[0.07] text-xs font-semibold">
                {openOrders.list.slice(0, 5).map((po) => (
                  <tr key={po.id} className="hover:bg-amber-900/[0.04] transition-colors">
                    <td className="py-3 px-4 font-extrabold text-[#3C2A21] whitespace-nowrap">{po.id}</td>
                    <td className="py-3 px-4 text-amber-900/70 truncate max-w-[14rem]">{po.supplier}</td>
                    <td className="py-3 px-4 text-amber-900/55 font-medium whitespace-nowrap">
                      {po.expectedDelivery || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-900/70 tabular-nums whitespace-nowrap">
                      {(po.itemsList || []).length}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#693F27] tabular-nums whitespace-nowrap">
                      {money(po.totalCost)}
                    </td>
                    <td className="py-3 px-4">
                      <PoStatusPill status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {openOrders.list.length > 5 && (
              <div className="px-6 py-3 border-t border-amber-900/10 bg-amber-900/[0.03]">
                <p className="text-[11px] text-amber-900/50 font-semibold tabular-nums">
                  Showing 5 of {openOrders.list.length} open orders
                </p>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
