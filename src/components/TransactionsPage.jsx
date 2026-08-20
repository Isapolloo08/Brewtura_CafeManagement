import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';
import { ModalPortal } from './ModalPortal.jsx';

const STATUS_STYLE = {
  completed:       { bg: 'bg-emerald-100',  text: 'text-emerald-800',  dot: 'bg-emerald-500',  label: 'Completed'       },
  confirmed:       { bg: 'bg-sky-100',       text: 'text-sky-800',      dot: 'bg-sky-500',      label: 'Confirmed'       },
  preparing:       { bg: 'bg-amber-100',     text: 'text-amber-800',    dot: 'bg-amber-500',    label: 'Preparing'       },
  ready:           { bg: 'bg-violet-100',    text: 'text-violet-800',   dot: 'bg-violet-500',   label: 'Ready'           },
  pending_payment: { bg: 'bg-orange-100',    text: 'text-orange-800',   dot: 'bg-orange-400',   label: 'Pending Payment' },
  cancelled:       { bg: 'bg-red-100',       text: 'text-red-800',      dot: 'bg-red-400',      label: 'Cancelled'       },
  refunded:        { bg: 'bg-slate-100',     text: 'text-slate-700',    dot: 'bg-slate-400',    label: 'Refunded'        },
};
const PAYMENT_STYLE = {
  cash:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Cash'    },
  card:    { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Card'    },
  gcash:   { bg: 'bg-sky-100',    text: 'text-sky-800',    label: 'GCash'   },
  paymaya: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'PayMaya' },
  unpaid:  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Unpaid'  },
};
const ORDER_TYPE_STYLE = {
  dine_in:  { bg: 'bg-amber-50',  text: 'text-amber-800',  label: 'Dine-In'  },
  takeaway: { bg: 'bg-lime-50',   text: 'text-lime-800',   label: 'Takeaway' },
  delivery: { bg: 'bg-indigo-50', text: 'text-indigo-800', label: 'Delivery' },
  pickup:   { bg: 'bg-teal-50',   text: 'text-teal-800',   label: 'Pickup'   },
};

const fmt = (v, cur = 'PHP') =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(v || 0);

const fmtDT = (ts) => {
  if (!ts) return '\u2014';
  return new Date(ts).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function Badge({ style = {}, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
      {style.dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      {children || style.label || '\u2014'}
    </span>
  );
}

function SummaryCard({ icon, label, value, sub, colorClass = 'from-[#693F27] to-[#3C2A21]' }) {
  return (
    <div className="glass-card rounded-2xl border border-white/60 p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0 shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-amber-900/55 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="font-heading font-extrabold text-xl text-[#3C2A21] leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-amber-900/45 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TransactionDrawer({ txn, onClose, currency }) {
  if (!txn) return null;
  const status = STATUS_STYLE[txn.status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: txn.status };
  const payment = PAYMENT_STYLE[txn.payment_method] || { bg: 'bg-slate-100', text: 'text-slate-700', label: txn.payment_method };

  return (
    <ModalPortal>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#FFFDF9] z-50 shadow-2xl flex flex-col overflow-hidden animate-slideInRight">
        <div className="flex items-center justify-between px-6 py-5 border-b border-amber-900/10 bg-gradient-to-r from-[#3C2A21] to-[#693F27]">
          <div>
            <p className="text-amber-300 text-[10px] font-bold uppercase tracking-widest mb-0.5">Order Transaction</p>
            <h3 className="font-heading font-extrabold text-white text-xl">{txn.order_number}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge style={status} />
            <Badge style={payment} />
            {txn.order_type && (
              <Badge style={ORDER_TYPE_STYLE[txn.order_type] || { bg: 'bg-slate-100', text: 'text-slate-700', label: txn.order_type }} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Branch',      value: txn.branch_name    || '\u2014' },
              { label: 'Date & Time', value: fmtDT(txn.created_at) },
              { label: 'Customer',    value: txn.customer_name  || 'Walk-in' },
              { label: 'Phone',       value: txn.customer_phone || '\u2014' },
              { label: 'Served by',   value: txn.placed_by_name || '\u2014' },
              { label: 'Table',       value: txn.table_number   || '\u2014' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-amber-50/60 rounded-xl p-3 border border-amber-100/60">
                <p className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-[#3C2A21] break-words">{value}</p>
              </div>
            ))}
          </div>

          {txn.items && txn.items.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-900/60 uppercase tracking-wide mb-2">Items Ordered</p>
              <div className="space-y-2">
                {txn.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-amber-900/5 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-[#3C2A21]">{it.name}</p>
                      <p className="text-[11px] text-amber-900/45 font-medium">&times; {it.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-[#693F27]">{fmt(it.unit_price * it.quantity, currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {txn.notes && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/50">
              <p className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-amber-900/80 font-medium">{txn.notes}</p>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#3C2A21]/5 to-[#693F27]/5 rounded-2xl p-4 border border-amber-900/10 space-y-2">
            {[
              { label: 'Subtotal',       value: txn.subtotal },
              { label: 'Tax',            value: txn.tax_total },
              { label: 'Service Charge', value: txn.service_charge_total },
              { label: 'Discount',       value: txn.discount_total, negate: true },
            ].filter(r => parseFloat(r.value) > 0).map(({ label, value, negate }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-amber-900/65 font-medium">{label}</span>
                <span className={`font-semibold ${negate ? 'text-green-700' : 'text-[#3C2A21]'}`}>
                  {negate ? '-' : ''}{fmt(value, currency)}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-amber-900/10 flex justify-between">
              <span className="font-bold text-[#3C2A21]">Total</span>
              <span className="font-extrabold text-[#693F27] text-lg">{fmt(txn.total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function TransactionsPage({ currency = 'PHP' }) {
  const [transactions, setTransactions] = useState([]);
  const [branches, setBranches]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selected, setSelected]         = useState(null);
  const [pagination, setPagination]     = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    branch_id: 'all', status: 'all', order_type: 'all',
    payment_method: 'all', start_date: '', end_date: '', search: '',
  });
  const [page, setPage] = useState(1);
  const searchTimer = useRef(null);

  const fetchTransactions = useCallback(async (f, p) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      Object.entries(f).forEach(([k, v]) => { if (v && v !== 'all') params.append(k, v); });
      const data = await api.getTransactions(params.toString());
      setTransactions(data.transactions || []);
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.listBranches().then(d => setBranches(d || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTransactions(filters, page);
  }, [filters, page, fetchTransactions]);

  const handleFilterChange = (key, value) => {
    setPage(1);
    if (key === 'search') {
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => setFilters(prev => ({ ...prev, search: value })), 400);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({
      branch_id: 'all', status: 'all', order_type: 'all',
      payment_method: 'all', start_date: '', end_date: '', search: '',
    });
  };

  const totalRevenue = transactions.reduce((s, t) => s + parseFloat(t.total || 0), 0);
  const paidCount    = transactions.filter(t => t.payment_status === 'paid').length;
  const avgOrder     = transactions.length ? totalRevenue / transactions.length : 0;

  const sel = 'bg-white/70 border border-amber-900/15 rounded-xl px-3 py-2 text-xs font-semibold text-[#3C2A21] focus:outline-none focus:ring-2 focus:ring-[#C08552]/40 hover:bg-white transition-colors';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="glass-card rounded-3xl border border-white/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
              Order Ledger
            </span>
            <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">All Transactions</h2>
            <p className="text-xs text-amber-900/60 font-medium mt-0.5">
              Every order across all branches &mdash; searchable, filterable, and auditable
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-900/50 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {pagination.total.toLocaleString()} total records
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          label="Revenue (page)" value={fmt(totalRevenue, currency)}
          sub={`${transactions.length} orders shown`} colorClass="from-[#693F27] to-[#3C2A21]" />
        <SummaryCard
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          label="Total Orders" value={pagination.total.toLocaleString()}
          sub="Matching filters" colorClass="from-sky-600 to-sky-800" />
        <SummaryCard
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
          label="Paid (page)" value={paidCount}
          sub={`${transactions.length - paidCount} unpaid`} colorClass="from-emerald-600 to-emerald-800" />
        <SummaryCard
          icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          label="Avg Order Value" value={fmt(avgOrder, currency)}
          sub="Page average" colorClass="from-violet-600 to-violet-800" />
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl border border-white/60 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-900/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Order # &middot; Customer &middot; Phone..."
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full bg-white/70 border border-amber-900/15 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-[#3C2A21] focus:outline-none focus:ring-2 focus:ring-[#C08552]/40 placeholder:text-amber-900/30"
              />
            </div>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">Branch</label>
            <select className={sel} value={filters.branch_id} onChange={e => handleFilterChange('branch_id', e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">Status</label>
            <select className={sel} value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">Type</label>
            <select className={sel} value={filters.order_type} onChange={e => handleFilterChange('order_type', e.target.value)}>
              <option value="all">All Types</option>
              {Object.entries(ORDER_TYPE_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">Payment</label>
            <select className={sel} value={filters.payment_method} onChange={e => handleFilterChange('payment_method', e.target.value)}>
              <option value="all">All Methods</option>
              {Object.entries(PAYMENT_STYLE).filter(([k]) => k !== 'unpaid').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">From</label>
            <input type="date" value={filters.start_date}
              onChange={e => handleFilterChange('start_date', e.target.value)}
              className={`${sel} w-36`} />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-amber-900/60 uppercase tracking-wide mb-1">To</label>
            <input type="date" value={filters.end_date}
              onChange={e => handleFilterChange('end_date', e.target.value)}
              className={`${sel} w-36`} />
          </div>

          <button onClick={resetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#693F27] bg-amber-100/60 hover:bg-amber-100 border border-amber-200/60 transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-white/60 overflow-hidden shadow-sm">
        <div className="px-6 py-3 border-b border-amber-900/8 bg-amber-50/40">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 text-[10px] font-extrabold text-amber-900/50 uppercase tracking-wider">
            <span>Order #</span><span>Branch</span><span>Customer</span>
            <span>Type / Table</span><span>Status</span><span>Total</span><span>Payment</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-[#C08552]/20 border-t-[#693F27] animate-spin" />
            <p className="text-xs font-semibold text-amber-900/50">Loading transactions&hellip;</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-10 h-10 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button onClick={() => fetchTransactions(filters, page)} className="text-xs text-[#693F27] underline font-semibold">Retry</button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-12 h-12 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" />
            </svg>
            <p className="text-sm font-bold text-amber-900/50">No transactions found</p>
            <p className="text-xs text-amber-900/35">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-amber-900/5">
            {transactions.map((txn, i) => {
              const st = STATUS_STYLE[txn.status]   || { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: txn.status };
              const pm = PAYMENT_STYLE[txn.payment_method] || { bg: 'bg-slate-100', text: 'text-slate-700', label: txn.payment_method };
              const ot = ORDER_TYPE_STYLE[txn.order_type] || { bg: 'bg-slate-50', text: 'text-slate-600', label: txn.order_type };
              return (
                <button
                  key={txn.id}
                  onClick={() => setSelected(txn)}
                  className={`w-full grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-6 py-3.5 text-left hover:bg-amber-50/60 active:bg-amber-100/40 transition-colors group ${i % 2 === 0 ? 'bg-white/20' : ''}`}
                >
                  <div>
                    <p className="text-xs font-bold text-[#3C2A21] group-hover:text-[#693F27] transition-colors">{txn.order_number}</p>
                    <p className="text-[10px] text-amber-900/40 font-medium mt-0.5">{fmtDT(txn.created_at)}</p>
                  </div>
                  <p className="text-xs font-semibold text-[#3C2A21] truncate">{txn.branch_name || '\u2014'}</p>
                  <div>
                    <p className="text-xs font-semibold text-[#3C2A21] truncate">{txn.customer_name || 'Walk-in'}</p>
                    {txn.customer_phone && <p className="text-[10px] text-amber-900/40 font-medium">{txn.customer_phone}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${ot.bg} ${ot.text}`}>{ot.label}</span>
                    {txn.table_number && <span className="text-[10px] text-amber-900/40 font-medium">Table {txn.table_number}</span>}
                  </div>
                  <Badge style={st} />
                  <p className="text-sm font-extrabold text-[#693F27]">{fmt(txn.total, currency)}</p>
                  <Badge style={pm} />
                </button>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-amber-900/8 bg-amber-50/30">
            <p className="text-xs text-amber-900/50 font-semibold">
              Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total.toLocaleString()} records
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#693F27] bg-white border border-amber-200 disabled:opacity-40 hover:bg-amber-50 transition-colors">
                &larr; Prev
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${p === pagination.page ? 'bg-[#3C2A21] text-amber-100 shadow-sm' : 'text-amber-900/60 hover:bg-amber-100'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#693F27] bg-white border border-amber-200 disabled:opacity-40 hover:bg-amber-50 transition-colors">
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <TransactionDrawer txn={selected} onClose={() => setSelected(null)} currency={currency} />
      )}
    </div>
  );
}

export default TransactionsPage;
