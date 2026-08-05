import React, { useEffect, useState } from 'react';
import { ModalPortal } from './ModalPortal';

function parseItems(matched) {
  if (typeof matched === 'string') {
    try { return JSON.parse(matched) || []; } catch { return []; }
  }
  return Array.isArray(matched) ? matched : [];
}

function parseAnalysis(analysis) {
  if (typeof analysis === 'string') {
    try { return JSON.parse(analysis) || null; } catch { return null; }
  }
  return analysis || null;
}

function parseName(fromEmail) {
  if (!fromEmail) return 'Supplier';
  const m = fromEmail.match(/^([^<]+)/);
  const name = m ? m[1].replace(/"/g, '').trim() : '';
  return name || fromEmail;
}

const VERDICT_STYLES = {
  agreed: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  rejected: 'bg-red-500/15 text-red-700 border-red-500/30',
  unclear: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
};
const VERDICT_LABELS = { agreed: 'Agreed', partial: 'Partial', rejected: 'Rejected', unclear: 'Unclear' };

export function SupplierScanAlert({ onClose, onViewPurchaseOrders, onStockUp, onReverseStock, message, contradiction }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [stocking, setStocking] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [stockedIds, setStockedIds] = useState(() => new Set());
  const [reversedIds, setReversedIds] = useState(() => new Set());
  const [stockError, setStockError] = useState('');

  useEffect(() => {
    if (!message) return;
    setStockError('');
    setStocking(false);
    setReversing(false);
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  const stocked = stockedIds.has(message.id) || Boolean(message.stocked_at);
  const reversed = reversedIds.has(message.id);
  const verdict = message.verdict;
  const analysis = parseAnalysis(message.analysis);
  const provided = analysis?.providedItems || [];
  const missing = analysis?.missingItems || [];
  const items = parseItems(message.matched_items);
  const contradicted = Array.isArray(contradiction) ? contradiction : [];

  const close = () => {
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setVisible(false);
      onClose();
    }, 180);
  };

  const handleStockUp = async () => {
    if (!onStockUp || stocking || stocked) return;
    setStocking(true);
    setStockError('');
    try {
      const result = await onStockUp({ message, provided });
      if (result && result.stocked) {
        setStockedIds(prev => new Set(prev).add(message.id));
      }
    } catch (err) {
      setStockError(err.message || 'Stocking failed');
    } finally {
      setStocking(false);
    }
  };

  const handleReverse = async () => {
    if (!onReverseStock || reversing || reversed) return;
    setReversing(true);
    setStockError('');
    try {
      const result = await onReverseStock({ message });
      if (result && result.reversed) {
        setReversedIds(prev => new Set(prev).add(message.id));
      }
    } catch (err) {
      setStockError(err.message || 'Reverse failed');
    } finally {
      setReversing(false);
    }
  };

  return (
    <ModalPortal>
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-200 ${visible && !leaving ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0 pointer-events-none'}`}>
        <div className={`w-full max-w-md glass-card rounded-3xl overflow-hidden border border-white/60 shadow-2xl transition-all duration-200 ${visible && !leaving ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="px-6 py-4 border-b border-amber-900/10 bg-gradient-to-r from-[#3C2A21] to-[#693F27] text-amber-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-base">
                  {verdict === 'agreed' ? '✅' : verdict === 'partial' ? '⚠️' : verdict === 'rejected' ? '❌' : '📨'}
                </span>
                <div>
                  <h4 className="font-heading font-extrabold text-base leading-tight">New Supplier Reply</h4>
                  <p className="text-[10px] font-semibold text-amber-200/80">Scan complete · {message.po_code || 'No PO'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-amber-100 text-sm font-bold transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[#3C2A21] truncate">{parseName(message.from_email)}</p>
                <p className="text-[10px] font-semibold text-amber-900/50 truncate">{message.subject || '(no subject)'}</p>
              </div>
              {verdict && (
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${VERDICT_STYLES[verdict] || VERDICT_STYLES.unclear}`}>
                  {VERDICT_LABELS[verdict] || verdict}
                </span>
              )}
            </div>

            {verdict && (
              <div className={`p-3 rounded-xl border text-[11px] font-semibold ${verdict === 'agreed' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                : verdict === 'partial' ? 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                  : verdict === 'rejected' ? 'bg-red-500/10 text-red-700 border-red-500/20'
                    : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20'}`}>
                {verdict === 'agreed' && `Supplier agreed to ${message.po_code}. Ready to review and stock the delivered items.`}
                {verdict === 'partial' && `Supplier can only partially fulfill ${message.po_code}. Review which items are available below.`}
                {verdict === 'rejected' && `Supplier declined ${message.po_code}. Check the reply for details.`}
                {verdict === 'unclear' && `Supplier reply for ${message.po_code} needs review.`}
              </div>
            )}

            {contradicted.length > 0 && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 space-y-2">
                <p className="text-[11px] font-extrabold text-red-700 uppercase tracking-wide">
                  ⚠️ Stock was taken, then supplier said unavailable
                </p>
                <p className="text-[10px] font-semibold text-red-700/90">
                  You already stocked {contradicted.map(c => `${c.name} (${c.receivedQty} ${c.unit})`).join(', ')} for this PO, but the latest reply says it's unavailable.
                </p>
                <button
                  type="button"
                  onClick={handleReverse}
                  disabled={reversing || reversed}
                  className="w-full px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {reversing ? 'Reversing...'
                    : reversed ? 'Stock Reversed ✓'
                      : `Reverse Stock & Reopen PO (${contradicted.length})`}
                </button>
              </div>
            )}

            {provided.length > 0 && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1.5">Will provide</p>
                <div className="flex flex-wrap gap-1.5">
                  {provided.map((it, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-500/10 text-emerald-800 border-emerald-500/20">
                      {it.quantity} {it.unit} · {it.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missing.length > 0 && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 mb-1.5">Missing / not provided</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((it, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-red-500/10 text-red-700 border-red-500/20">
                      {it.quantity} {it.unit} · {it.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {provided.length === 0 && items.length > 0 && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#693F27] mb-1.5">Items detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((it, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-amber-900/10 text-[#693F27] border-amber-900/20">
                      {it.quantity} {it.unit} · {it.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-amber-900/10 bg-white/60 flex flex-col gap-2">
            {stockError && (
              <p className="text-[11px] font-bold text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {stockError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-xl bg-amber-900/10 text-[#693F27] text-xs font-bold hover:bg-amber-900/20 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => { close(); onViewPurchaseOrders(); }}
                className="px-4 py-2 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 transition-all"
              >
                View Purchase Orders
              </button>
              {onStockUp && provided.length > 0 && contradicted.length === 0 && (
                <button
                  type="button"
                  onClick={handleStockUp}
                  disabled={stocking || stocked}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {stocking ? 'Stocking…'
                    : stocked ? 'Stocked ✓'
                      : `Stock Up ${provided.length} item${provided.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default SupplierScanAlert;
