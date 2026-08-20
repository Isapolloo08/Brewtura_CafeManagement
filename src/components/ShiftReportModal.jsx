import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';

const fmtMoney = (v) => `$${Number(v == null ? 0 : v).toFixed(2)}`;
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const METHOD_LABEL = { cash: 'Cash', card: 'Card', gcash: 'GCash', maya: 'Maya', other: 'Other' };

const SUMMARIZE = (o) => ({
  ...o,
  items_count: (o.items || []).reduce((s, i) => s + Number(i.quantity), 0),
  payments_text: (o.payments || []).map((p) => METHOD_LABEL[p.method] || p.method).join(', ') || '—',
});

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'ChartBar' },
  { id: 'transactions', label: 'Transactions', icon: 'Receipt' },
  { id: 'history', label: 'Order History', icon: 'History' },
];

export function ShiftReportModal({ shiftId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.getShiftReport(shiftId);
        if (!cancelled) setData(res);
      } catch (err) {
        console.error('Failed to load shift report:', err);
        if (!cancelled) setError('Failed to load shift report from server.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [shiftId]);

  if (loading) {
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-card rounded-3xl p-8 text-center text-xs font-bold text-amber-900/60">Loading shift report...</div>
        </div>
      </ModalPortal>
    );
  }

  if (error || !data) {
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="glass-card rounded-3xl p-8 space-y-4 text-center">
            <p className="text-xs font-bold text-red-700">{error || 'No report data.'}</p>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-extrabold hover:brightness-110">
              Close
            </button>
          </div>
        </div>
      </ModalPortal>
    );
  }

  const { shift, summary, orders } = data;
  const status = shift.closed_at ? 'Closed' : 'Open';
  const rows = orders.map(SUMMARIZE);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const TabIcon = ({ name }) => { const C = Icons[name]; return C ? <C className="w-3.5 h-3.5" /> : null; };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-4xl max-h-[90vh] flex flex-col glass-card rounded-3xl border border-white/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/10 bg-amber-900/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C08552]/20 flex items-center justify-center text-[#693F27]">
                <Icons.Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#3C2A21]">Shift Report #{shift.id}</h3>
                <p className="text-[11px] text-amber-900/55 font-medium">{shift.branch_name} · {shift.cashier}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                status === 'Closed' ? 'bg-emerald-500/10 text-emerald-800' : 'bg-blue-500/10 text-blue-700'
              }`}>{status}</span>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-amber-900/10 text-amber-900/50 hover:text-[#3C2A21] font-bold transition-colors" aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 flex gap-2 border-b border-amber-900/10">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-[11px] font-extrabold transition-colors border-b-2 ${
                  tab === t.id
                    ? 'border-[#C08552] text-[#693F27] bg-[#C08552]/10'
                    : 'border-transparent text-amber-900/50 hover:text-[#3C2A21] hover:bg-amber-900/5'
                }`}
              >
                <TabIcon name={t.icon} />
                {t.label}
                {t.id === 'transactions' && orders.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#3C2A21] text-amber-100 text-[9px] font-extrabold">{orders.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2 text-[11px] font-bold text-amber-900/60">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-900/5">
                    Opened {fmtDateTime(shift.opened_at)}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-900/5">
                    Closed {shift.closed_at ? fmtDateTime(shift.closed_at) : '— (still open)'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-900/5">
                    <Icons.Receipt className="w-3 h-3 inline -mt-0.5 mr-1" />
                    {summary.transaction_count} transactions
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800/70">Total Income</p>
                    <p className="mt-1 font-heading font-extrabold text-xl text-emerald-900">{fmtMoney(summary.total_sales)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-900/5 border border-white/60">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Cash Sales</p>
                    <p className="mt-1 font-heading font-extrabold text-xl text-[#3C2A21]">{fmtMoney(summary.cash_sales)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800/70">Digital Payments</p>
                    <p className="mt-1 font-heading font-extrabold text-xl text-blue-900">{fmtMoney(summary.digital_sales)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#C08552]/10 border border-[#C08552]/30">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#693F27]/70">Cash Drawer</p>
                    <p className="mt-1 font-heading font-extrabold text-xl text-[#3C2A21]">{fmtMoney(shift.opening_cash)} → {fmtMoney(shift.actual_cash)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-900/5 border border-white/60">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Expected Cash</p>
                    <p className="mt-1 font-heading font-extrabold text-xl text-[#3C2A21]">{fmtMoney(summary.expected_cash)}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${
                    summary.variance === null || Math.abs(summary.variance) < 0.005
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Variance</p>
                    <p className={`mt-1 font-heading font-extrabold text-xl ${
                      summary.variance === null ? 'text-amber-900/50' : Math.abs(summary.variance) < 0.005 ? 'text-emerald-900' : 'text-red-700'
                    }`}>
                      {summary.variance === null ? '—' : fmtMoney(summary.variance)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── TRANSACTIONS ── */}
            {tab === 'transactions' && (
              <div>
                {rows.length === 0 ? (
                  <p className="p-6 text-center text-xs font-bold text-amber-900/50 bg-amber-900/5 rounded-2xl">No orders recorded during this shift.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-amber-900/10 text-amber-900/50 text-[10px] font-extrabold uppercase tracking-wider bg-amber-900/5">
                          <th className="py-3 px-4 w-8"></th>
                          <th className="py-3 pr-4">Order #</th>
                          <th className="py-3 pr-4">Time</th>
                          <th className="py-3 pr-4">Customer</th>
                          <th className="py-3 pr-4">Type</th>
                          <th className="py-3 pr-4 text-right">Items</th>
                          <th className="py-3 pr-4">Payments</th>
                          <th className="py-3 pr-4 text-right">Amount</th>
                          <th className="py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-900/8 text-xs font-semibold">
                        {rows.map((o) => {
                          const open = !!expanded[o.id];
                          const itemsTotal = o.items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
                          return (
                            <React.Fragment key={o.id}>
                              <tr className="hover:bg-amber-900/4 transition-colors">
                                <td className="py-3 px-4">
                                  <button type="button" onClick={() => toggle(o.id)}
                                    className="p-1 rounded-lg text-amber-900/40 hover:text-[#693F27] hover:bg-amber-900/10 transition-colors" aria-label="Toggle details">
                                    <Icons.ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                  </button>
                                </td>
                                <td className="py-3 pr-4">
                                  <span className="px-2.5 py-1 rounded-lg bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold whitespace-nowrap">
                                    {o.order_number}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 text-amber-900/70 whitespace-nowrap">{fmtTime(o.created_at)}</td>
                                <td className="py-3 pr-4 font-bold text-[#3C2A21]">{o.customer_name || 'Walk-in'}</td>
                                <td className="py-3 pr-4 text-amber-900/70 capitalize">{o.order_type.replace('_', ' ')}{o.table_number ? ` · T${o.table_number}` : ''}</td>
                                <td className="py-3 pr-4 text-right font-bold text-amber-900/70">{o.items_count}</td>
                                <td className="py-3 pr-4 text-amber-900/70">{o.payments_text}</td>
                                <td className="py-3 pr-4 text-right font-extrabold text-[#3C2A21]">{fmtMoney(o.total)}</td>
                                <td className="py-3 pr-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                    o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-800'
                                    : o.status === 'cancelled' ? 'bg-red-500/10 text-red-700'
                                    : o.status === 'preparing' || o.status === 'ready' ? 'bg-blue-500/10 text-blue-700'
                                    : 'bg-amber-500/12 text-amber-900'
                                  }`}>{o.status}</span>
                                </td>
                              </tr>
                              {open && (
                                <tr>
                                  <td colSpan="9" className="py-0 px-4">
                                    <div className="py-3 space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Items */}
                                        <div className="rounded-xl bg-amber-900/5 border border-white/60 p-3">
                                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/45 mb-1.5">Items</p>
                                          {o.items.length === 0 && <p className="text-[11px] text-amber-900/50 font-semibold">No items — order may be pending.</p>}
                                          <div className="space-y-1">
                                            {o.items.map((it, idx) => (
                                              <div key={idx} className="flex justify-between gap-2 text-[11px] font-semibold">
                                                <span className="text-[#3C2A21]">
                                                  {it.quantity}× {it.product_name}
                                                  {it.customization_name ? <span className="text-amber-900/50"> · {it.customization_name}</span> : null}
                                                </span>
                                                <span className="font-bold text-amber-900/70">{fmtMoney(Number(it.unit_price) * Number(it.quantity))}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-amber-900/8 text-[11px] font-bold text-amber-900/60">
                                            <span>Subtotal</span>
                                            <span className="text-[#3C2A21] font-extrabold">{fmtMoney(itemsTotal)}</span>
                                          </div>
                                        </div>

                                        {/* Payments */}
                                        <div className="rounded-xl bg-amber-900/5 border border-white/60 p-3">
                                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/45 mb-1.5">Payments</p>
                                          {o.payments.length === 0 && <p className="text-[11px] text-amber-900/50 font-semibold">Unpaid</p>}
                                          <div className="space-y-1">
                                            {o.payments.map((p, idx) => (
                                              <div key={idx} className="flex justify-between gap-2 text-[11px] font-semibold">
                                                <span className="text-[#3C2A21]">
                                                  <Icons.CreditCard className="w-3 h-3 inline -mt-0.5 mr-1 text-amber-900/50" />
                                                  {METHOD_LABEL[p.method] || p.method}{p.reference_no ? ` (${p.reference_no})` : ''}
                                                  <span className="text-amber-900/45"> · {fmtTime(p.paid_at)}{p.received_by ? ` · by ${p.received_by}` : ''}</span>
                                                </span>
                                                <span className="font-bold text-amber-900/70">{fmtMoney(p.amount)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Order history */}
                                      <div className="rounded-xl bg-amber-900/5 border border-white/60 p-3">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/45 mb-1.5">
                                          <Icons.History className="w-3 h-3 inline -mt-0.5 mr-1" />Order History
                                        </p>
                                        {o.history.length === 0 && <p className="text-[11px] text-amber-900/50 font-semibold">No status changes recorded.</p>}
                                        <div className="space-y-1">
                                          {o.history.map((h, idx) => (
                                            <div key={idx} className="flex justify-between gap-2 text-[11px] font-semibold">
                                              <span className="text-[#3C2A21]">{h.status}{h.changed_by ? <span className="text-amber-900/45"> · by {h.changed_by}</span> : null}</span>
                                              <span className="font-bold text-amber-900/70">{fmtDateTime(h.changed_at)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ORDER HISTORY ── */}
            {tab === 'history' && (
              <div>
                {orders.length === 0 ? (
                  <p className="p-6 text-center text-xs font-bold text-amber-900/50 bg-amber-900/5 rounded-2xl">No orders recorded during this shift.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-amber-900/10 text-amber-900/50 text-[10px] font-extrabold uppercase tracking-wider bg-amber-900/5">
                          <th className="py-3 px-4">Order #</th>
                          <th className="py-3 pr-4">Customer</th>
                          <th className="py-3 pr-4">Time</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 pr-4">Changed By</th>
                          <th className="py-3 pr-4 text-right">Amount</th>
                          <th className="py-3 text-right">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-900/8 text-xs font-semibold">
                        {rows.map((o) => (
                          <React.Fragment key={o.id}>
                            {o.history.length === 0 ? (
                              <tr className="hover:bg-amber-900/4 transition-colors">
                                <td className="py-3 px-4"><span className="px-2.5 py-1 rounded-lg bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold">{o.order_number}</span></td>
                                <td className="py-3 pr-4 font-bold text-[#3C2A21]">{o.customer_name || 'Walk-in'}</td>
                                <td className="py-3 pr-4 text-amber-900/70">{fmtTime(o.created_at)}</td>
                                <td className="py-3 pr-4 font-bold text-[#3C2A21]">{o.status}</td>
                                <td className="py-3 pr-4 text-amber-900/50">—</td>
                                <td className="py-3 pr-4 text-right font-extrabold text-[#3C2A21]">{fmtMoney(o.total)}</td>
                                <td className="py-3 text-right text-amber-900/70">{o.payments_text}</td>
                              </tr>
                            ) : (
                              o.history.map((h, idx) => (
                                <tr key={`${o.id}-${idx}`} className="hover:bg-amber-900/4 transition-colors">
                                  <td className="py-3 px-4">
                                    {idx === 0 ? (
                                      <span className="px-2.5 py-1 rounded-lg bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold">{o.order_number}</span>
                                    ) : (
                                      <span className="text-amber-900/30 text-[10px]">↳</span>
                                    )}
                                  </td>
                                  <td className="py-3 pr-4 font-bold text-[#3C2A21]">{idx === 0 ? (o.customer_name || 'Walk-in') : ''}</td>
                                  <td className="py-3 pr-4 text-amber-900/70">{idx === 0 ? fmtTime(o.created_at) : ''}</td>
                                  <td className="py-3 pr-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                      h.status === 'completed' ? 'bg-emerald-500/10 text-emerald-800'
                                      : h.status === 'cancelled' ? 'bg-red-500/10 text-red-700'
                                      : h.status === 'preparing' || h.status === 'ready' ? 'bg-blue-500/10 text-blue-700'
                                      : 'bg-amber-500/12 text-amber-900'
                                    }`}>{h.status}</span>
                                  </td>
                                  <td className="py-3 pr-4 text-amber-900/70">{h.changed_by || '—'}</td>
                                  <td className="py-3 pr-4 text-right font-extrabold text-[#3C2A21]">{idx === 0 ? fmtMoney(o.total) : ''}</td>
                                  <td className="py-3 text-right text-amber-900/70">{idx === 0 ? o.payments_text : ''}</td>
                                </tr>
                              ))
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-amber-900/10 flex justify-end bg-amber-900/5">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-extrabold hover:brightness-110 transition-all">
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}