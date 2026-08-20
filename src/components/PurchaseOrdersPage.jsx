import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ModalPortal } from './ModalPortal';
import { InboxPanel } from './InboxPanel';
import api from '../services/api.js';
import { socket } from '../services/socket.js';

function buildSupplierMessage(po, supplierEmail) {
  const items = (po.itemsList || []).map(i => `- ${i.name}: ${i.qty} ${i.unit} ($${i.lineTotal.toFixed(2)})`).join('\n');
  return [
    `SUBJECT: Order Confirmation ${po.id} - ${po.supplier}`,
    '',
    `To: ${supplierEmail || po.supplier}`,
    '',
    `Hello ${po.supplier},`,
    '',
    `Please confirm and deliver the following items for our purchase order ${po.id}:`,
    '',
    items,
    '',
    `TOTAL: $${po.totalCost.toFixed(2)}`,
    '',
    `Expected delivery: ${po.expectedDelivery}`,
    'Thank you!',
  ].join('\n');
}

function supplierEmailParts(po, supplierEmail) {
  const items = (po.itemsList || []).map(i => `- ${i.name}: ${i.qty} ${i.unit} ($${i.lineTotal.toFixed(2)})`).join('\n');
  const body = [
    `Hello ${po.supplier},`,
    '',
    `Please confirm and deliver the following items for our purchase order ${po.id}:`,
    '',
    items,
    '',
    `TOTAL: $${po.totalCost.toFixed(2)}`,
    '',
    `Expected delivery: ${po.expectedDelivery}`,
    'Thank you!',
  ].join('\n');
  return {
    to: supplierEmail || po.supplier,
    subject: `Order Confirmation ${po.id} - ${po.supplier}`,
    body,
  };
}

function normalizePoCode(code) {
  return (code || '').replace(/[^0-9PO]/gi, '').toUpperCase();
}

function parseName(fromEmail) {
  if (!fromEmail) return 'Supplier';
  const m = fromEmail.match(/^([^<]+)/);
  const name = m ? m[1].replace(/"/g, '').trim() : '';
  return name || fromEmail;
}

function parseMessageAnalysis(m) {
  let verdict = m?.verdict || null;
  let analysis = null;
  if (m?.analysis) {
    if (typeof m.analysis === 'string') {
      try { analysis = JSON.parse(m.analysis) || null; } catch { analysis = null; }
    } else {
      analysis = m.analysis;
    }
  }
  return { verdict, analysis };
}

const VERDICT_STYLES = {
  agreed: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  rejected: 'bg-red-500/15 text-red-700 border-red-500/30',
  unclear: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30',
};
const VERDICT_LABELS = { agreed: 'Agreed', partial: 'Partial', rejected: 'Rejected', unclear: 'Unclear' };

// --- NEW: strip quoted reply chains out of inbound email bodies ---
// Gmail-style replies typically append the original message below a line like
// "On <date>, <name> <email> wrote:" followed by "> " quoted lines. We only
// want to show the NEW text the supplier actually typed.
function stripQuotedReply(rawBody) {
  if (!rawBody) return '';
  const lines = rawBody.split('\n');
  const cutMarkers = [
    /^On .+ wrote:\s*$/i,
    /^-{2,}\s*Original Message\s*-{2,}/i,
    /^From:\s.+/i,
  ];
  let cutIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (cutMarkers.some(re => re.test(lines[i].trim()))) {
      cutIndex = i;
      break;
    }
  }
  const newLines = lines.slice(0, cutIndex).filter(line => !line.trim().startsWith('>'));
  // trim trailing blank lines
  while (newLines.length && newLines[newLines.length - 1].trim() === '') newLines.pop();
  return newLines.join('\n').trim() || rawBody.trim();
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

function ChatBubble({ side, sender, time, subject, quote, children }) {
  const isOut = side === 'out';
  return (
    <div className={`flex items-end gap-2 ${isOut ? 'justify-end' : 'justify-start'}`}>
      {!isOut && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C08552] to-[#693F27] text-amber-50 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-sm uppercase">
          {initials(sender)}
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs shadow-sm ${isOut
        ? 'bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 rounded-br-sm'
        : 'bg-white border border-amber-900/10 text-[#3C2A21] rounded-bl-sm'
        }`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">{sender}</span>
          {time && (
            <span className={`text-[9px] font-semibold ${isOut ? 'text-amber-200/70' : 'text-amber-900/40'}`}>{time}</span>
          )}
        </div>
        {quote && (
          <div className={`mb-2 rounded-xl px-3 py-2 border-l-4 text-[10px] font-semibold ${isOut ? 'bg-amber-100/15 border-amber-100/60 text-amber-100/90' : 'bg-amber-900/5 border-[#C08552] text-amber-900/70'}`}>
            <p className="font-extrabold mb-0.5">
              {quote.sender ? `Reply to ${quote.sender}` : 'Reply to message'}
            </p>
            <p className="line-clamp-2">{quote.text}</p>
          </div>
        )}
        {subject && (
          <p className={`text-[10px] font-bold mb-1.5 pb-1.5 border-b ${isOut ? 'text-amber-200/80 border-amber-100/15' : 'text-[#693F27] border-amber-900/10'}`}>
            {subject}
          </p>
        )}
        <pre className="whitespace-pre-wrap font-medium font-sans text-[11px] leading-relaxed m-0">{children}</pre>
      </div>
      {isOut && (
        <div className="w-7 h-7 rounded-full bg-[#3C2A21] text-amber-100 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-sm uppercase">
          You
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (err) {
          console.warn('Copy failed', err);
        }
      }}
      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-900/10 text-[#693F27] hover:bg-amber-900/20 transition-colors"
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function MessageMenu({ expanded, onToggle, onView, onChat, onSend, sending, sent, onCopy, unseenCount }) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const handleToggle = () => {
    if (!expanded && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuWidth = 190;
      let left = rect.right - menuWidth;
      // clamp so it never runs off the left/right edge of the viewport
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      setMenuPos({ top: rect.bottom + 6, left });
    }
    onToggle();
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="relative text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#693F27] text-amber-100 hover:brightness-110 transition-colors flex items-center gap-1"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Contact
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {unseenCount > 0 && (
          <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {expanded && (
        <ModalPortal>
          <div className="fixed inset-0 z-30" onClick={onToggle} />
          <div
            className="fixed z-40 min-w-[180px] glass-card rounded-2xl border border-white/60 shadow-2xl p-1.5 animate-scaleIn"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              onClick={onView}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-[#3C2A21] hover:bg-amber-900/5 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-amber-900/10 text-[#693F27] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              </span>
              View Message
            </button>
            <button
              type="button"
              onClick={onChat}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-[#3C2A21] hover:bg-amber-900/5 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-[#693F27]/10 text-[#693F27] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </span>
              Open Chat
              {unseenCount > 0 && (
                <span className="ml-auto min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                  {unseenCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={async () => {
                await onCopy();
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-[#3C2A21] hover:bg-amber-900/5 transition-colors"
            >
              <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-800 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              </span>
              {copied ? 'Copied ✓' : 'Copy Message'}
            </button>
            <button
              type="button"
              disabled={sending || sent}
              onClick={onSend}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold text-[#3C2A21] hover:bg-amber-900/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="w-6 h-6 rounded-lg bg-[#3C2A21]/10 text-[#3C2A21] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </span>
              {sending ? 'Sending...' : sent ? 'Sent ✓' : 'Send Email'}
            </button>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

export function PurchaseOrdersPage({ purchaseOrders, suppliers, ingredients, can, onCreatePurchaseOrder, onUpdatePurchaseOrder, onDeletePurchaseOrder, onRefreshPurchaseOrders }) {
  const [showModal, setShowModal] = useState(false);
  const [expandedPo, setExpandedPo] = useState(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);
  const [editingPo, setEditingPo] = useState(null);
  const [deletingPo, setDeletingPo] = useState(null);
  const [editSupplier, setEditSupplier] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editStatus, setEditStatus] = useState('Pending Approval');
  const [editItems, setEditItems] = useState([]);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [poSupplier, setPoSupplier] = useState(suppliers[0]?.name || '');
  const [poItems, setPoItems] = useState(() => Object.fromEntries((ingredients || []).map(ing => [String(ing.id), 0])));
  const [poDeliveryDate, setPoDeliveryDate] = useState(() => new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [sendingId, setSendingId] = useState(null);
  const [sendMsg, setSendMsg] = useState('');
  const [confirmPo, setConfirmPo] = useState(null);
  const [sentPoIds, setSentPoIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('po_sent_ids') || '[]'); } catch { return []; }
  });

  const markSent = (poId) => {
    setSentPoIds(prev => {
      if (prev.includes(poId)) return prev;
      const next = [...prev, poId];
      try { localStorage.setItem('po_sent_ids', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const [supplierMessages, setSupplierMessages] = useState([]);
  const [chatPo, setChatPo] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [refreshingMsgs, setRefreshingMsgs] = useState(false);
  const [stockingId, setStockingId] = useState(null);
  const [reversingId, setReversingId] = useState(null);
  const [seenMsgIds, setSeenMsgIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('po_seen_messages') || '[]'); } catch { return []; }
  });

  const saveSeen = (ids) => {
    setSeenMsgIds(ids);
    try { localStorage.setItem('po_seen_messages', JSON.stringify(ids)); } catch { /* ignore */ }
  };

  const msgsForPo = (po) =>
    (supplierMessages || []).filter(m => normalizePoCode(m.po_code) === normalizePoCode(po.id));

  const refreshMessages = useCallback(async () => {
    setRefreshingMsgs(true);
    try {
      const msgs = await api.getGmailMessages();
      setSupplierMessages(msgs || []);
    } catch (err) {
      console.warn('Failed to load supplier messages:', err);
    } finally {
      setRefreshingMsgs(false);
    }
  }, []);

  const scanInbox = useCallback(async () => {
    setRefreshingMsgs(true);
    try {
      await api.pollGmail();
      const msgs = await api.getGmailMessages();
      setSupplierMessages(msgs || []);
    } catch (err) {
      console.warn('Poll/scan failed:', err);
      alert('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRefreshingMsgs(false);
    }
  }, []);

  useEffect(() => { refreshMessages(); }, [refreshMessages]);

  useEffect(() => {
    const onMessage = () => { refreshMessages(); };
    socket.on('supplier-message', onMessage);
    socket.on('supplier-message-refresh', onMessage);
    return () => {
      socket.off('supplier-message', onMessage);
      socket.off('supplier-message-refresh', onMessage);
    };
  }, [refreshMessages]);

  const openChat = (po) => {
    setChatPo(po);
    setChatMsg('');
    refreshMessages();
    const ids = msgsForPo(po).map(m => m.id);
    if (ids.length > 0) saveSeen([...new Set([...seenMsgIds, ...ids])]);
  };

  // Keep the open chat's PO in sync with refreshed purchaseOrders (e.g. after
  // a stock-in/reverse updates receivedQty) so the remaining balance and
  // contradiction banner always reflect current data.
  const chatPoRef = useRef(chatPo);
  useEffect(() => { chatPoRef.current = chatPo; }, [chatPo]);
  useEffect(() => {
    const current = chatPoRef.current;
    if (!current) return;
    const fresh = (purchaseOrders || []).find(p => normalizePoCode(p.id) === normalizePoCode(current.id));
    if (fresh) setChatPo(fresh);
  }, [purchaseOrders]);

  const handleSendEmail = async (po, supplierEmail) => {
    const parts = supplierEmailParts(po, supplierEmail);
    if (!supplierEmail) {
      setSendMsg(`No email on file for ${po.supplier}. Add it in Inventory > Suppliers.`);
      return;
    }
    setSendingId(po.id);
    setSendMsg('');
    try {
      await api.sendGmailEmail(parts);
      markSent(po.id);
      setSendMsg(`Email sent for ${po.id} ✓`);
    } catch (err) {
      setSendMsg('Send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingId(null);
    }
  };

  const handleQtyChange = (id, val) => {
    setPoItems(prev => ({ ...prev, [String(id)]: parseFloat(val) || 0 }));
  };

  const handleSendReply = async (po) => {
    const body = chatInput.trim();
    if (!body) return;
    if (!po.supplierEmail) {
      setChatMsg(`No email on file for ${po.supplier}. Add it in Inventory > Suppliers.`);
      return;
    }
    const poMsgs = supplierMessages.filter(m => normalizePoCode(m.po_code) === normalizePoCode(po.id));
    const lastSupplierMsg = poMsgs[poMsgs.length - 1];
    setSendingReply(true);
    setChatMsg('');
    try {
      await api.sendGmailEmail({
        to: po.supplierEmail,
        subject: `Re: ${lastSupplierMsg?.subject || `Order Confirmation ${po.id} - ${po.supplier}`}`,
        body,
        messageId: lastSupplierMsg?.gmail_message_id,
        poCode: po.id,
        replyToId: lastSupplierMsg?.gmail_message_id,
      });
      setChatInput('');
      setChatMsg(`Reply sent to ${po.supplier} ✓`);
      await refreshMessages();
    } catch (err) {
      setChatMsg('Send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingReply(false);
    }
  };

  const latestAnalysisForPo = (po) => {
    // msgsForPo preserves the API order (parsed_at DESC, newest first), so
    // iterate forward to return the NEWEST analyzed reply — not the oldest.
    const msgs = msgsForPo(po)
      .filter(m => m.direction !== 'out')
      .slice()
      .sort((a, b) => new Date(b.parsed_at) - new Date(a.parsed_at));
    for (const m of msgs) {
      const { verdict, analysis } = parseMessageAnalysis(m);
      if (verdict) return { verdict, analysis, message: m };
    }
    return null;
  };

  const handleApproveStock = async (po) => {
    const latest = latestAnalysisForPo(po);
    const providedItems = latest?.analysis?.providedItems || [];
    if (!latest || providedItems.length === 0) return;
    if (latest.message?.stocked_at) {
      setChatMsg('Already stocked from a previous scan — nothing to do.');
      return;
    }
    setStockingId(po.id);
    setChatMsg('');
    try {
      const res = await api.stockInFromPo({
        poCode: po.id,
        items: providedItems.map(it => ({ name: it.name, quantity: it.quantity, unit: it.unit })),
        messageId: latest.message.id,
      });
      const stockedLabel = `${res.stocked.length} item(s)`;
      const alreadyLabel = res.alreadyReceived && res.alreadyReceived.length > 0
        ? ` · ${res.alreadyReceived.length} already fully received (${res.alreadyReceived.map(u => u.name).join(', ')})`
        : '';
      const unmatchedLabel = res.unmatched.length > 0
        ? ` · ${res.unmatched.length} not matched in inventory: ${res.unmatched.map(u => u.name).join(', ')}`
        : '';
      setChatMsg(`Stocked ${stockedLabel} for ${po.id} ✓${alreadyLabel}${unmatchedLabel}`);
      await refreshMessages();
      if (onRefreshPurchaseOrders) await onRefreshPurchaseOrders();
    } catch (err) {
      setChatMsg('Stocking failed: ' + (err.message || 'Unknown error'));
    } finally {
      setStockingId(null);
    }
  };

  const handleReverseStock = async (po) => {
    if (!po) return;
    setReversingId(po.id);
    setChatMsg('');
    try {
      const res = await api.reverseStockFromPo({ poCode: po.id });
      const reversedLabel = res.reversed && res.reversed.length > 0
        ? `${res.reversed.length} item(s): ${res.reversed.map(u => `${u.name} (${u.quantity} ${u.unit})`).join(', ')}`
        : 'no items to reverse';
      setChatMsg(`Reversed stock for ${po.id} — ${reversedLabel}. PO reopened as ${res.status}.`);
      await refreshMessages();
      if (onRefreshPurchaseOrders) await onRefreshPurchaseOrders();
    } catch (err) {
      setChatMsg('Reverse failed: ' + (err.message || 'Unknown error'));
    } finally {
      setReversingId(null);
    }
  };

  // Map item name -> { qty, receivedQty, remaining } for a PO so the scan
  // result can reflect the balance still owed by the supplier.
  const remainingForPo = (po) => {
    const map = {};
    for (const it of po?.itemsList || []) {
      const key = String(it.name || '').toLowerCase();
      const qty = parseFloat(it.qty) || 0;
      const receivedQty = parseFloat(it.receivedQty) || 0;
      map[key] = { name: it.name, qty, receivedQty, remaining: Math.max(0, qty - receivedQty) };
    }
    return map;
  };

  const orderedItems = (ingredients || []).filter(ing => (poItems[String(ing.id)] || 0) > 0);
  const totalCost = orderedItems.reduce((sum, ing) => sum + (poItems[String(ing.id)] || 0) * ing.costPerUnit, 0);
  const nonOrdered = (ingredients || []).filter(ing => !((poItems[String(ing.id)] || 0) > 0));

  const draftPo = {
    id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
    supplier: poSupplier,
    itemsList: orderedItems.map(ing => ({
      name: ing.name,
      qty: poItems[String(ing.id)],
      unit: ing.unit,
      costPerUnit: ing.costPerUnit,
      lineTotal: poItems[String(ing.id)] * ing.costPerUnit,
    })),
    totalCost,
    expectedDelivery: poDeliveryDate,
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (orderedItems.length === 0) return;
    const supplier = suppliers.find(s => s.name === poSupplier);
    const newPo = {
      ...draftPo,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending Approval',
      supplierEmail: supplier?.email || '',
    };
    setConfirmPo({ po: newPo, email: supplier?.email || '' });
  };

  const confirmSend = async () => {
    const { po: newPo, email } = confirmPo || {};
    if (!newPo) return;
    setConfirmPo(null);
    onCreatePurchaseOrder(newPo);
    setShowModal(false);
    setPoItems(Object.fromEntries((ingredients || []).map(ing => [String(ing.id), 0])));
    if (!email) {
      setSendMsg(`No email on file for ${newPo.supplier}. Add it in Inventory > Suppliers.`);
      return;
    }
    setSendingId(newPo.id);
    setSendMsg('');
    try {
      await api.sendGmailEmail(supplierEmailParts(newPo, email));
      markSent(newPo.id);
      setSendMsg(`Email sent for ${newPo.id} ✓`);
    } catch (err) {
      setSendMsg('Send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingId(null);
    }
  };

  const confirmWithoutSend = () => {
    const { po: newPo } = confirmPo || {};
    if (!newPo) return;
    setConfirmPo(null);
    onCreatePurchaseOrder(newPo);
    setShowModal(false);
    setPoItems(Object.fromEntries((ingredients || []).map(ing => [String(ing.id), 0])));
  };

  const openEdit = (po) => {
    setEditingPo(po);
    setEditSupplier(po.supplier || '');
    setEditDeliveryDate(po.expectedDelivery || '');
    setEditStatus(po.status || 'Pending Approval');
    setEditItems((po.itemsList || []).map(it => ({ ...it })));
  };

  const handleEditItemQty = (idx, val) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: parseFloat(val) || 0, lineTotal: (parseFloat(val) || 0) * (it.costPerUnit || 0) } : it));
  };

  const handleEditSupplier = (e) => {
    setEditSupplier(e.target.value);
  };

  const saveEdit = async () => {
    if (!editingPo) return;
    setEditBusy(true);
    try {
      const updated = {
        supplier: editSupplier,
        supplierEmail: suppliers.find(s => s.name === editSupplier)?.email || editingPo.supplierEmail || '',
        date: editingPo.date,
        expectedDelivery: editDeliveryDate,
        status: editStatus,
        totalCost: editItems.reduce((sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.costPerUnit) || 0), 0),
        itemsList: editItems,
      };
      await onUpdatePurchaseOrder(editingPo.id, updated);
      setSendMsg(`Purchase order ${editingPo.id} updated ✓`);
      setEditingPo(null);
    } catch (err) {
      setSendMsg('Update failed: ' + (err.message || 'Unknown error'));
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPo) return;
    setDeleteBusy(true);
    try {
      await onDeletePurchaseOrder(deletingPo.id);
      setSendMsg(`Purchase order ${deletingPo.id} deleted ✓`);
      setDeletingPo(null);
    } catch (err) {
      setSendMsg('Delete failed: ' + (err.message || 'Unknown error'));
      setDeletingPo(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const buildMessageFor = (po) => buildSupplierMessage(po, po.supplierEmail);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-3xl border border-white/60">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-900/10 text-[#693F27] text-xs font-extrabold uppercase tracking-wider mb-2">
            Procurement
          </span>
          <h2 className="font-heading font-extrabold text-2xl text-[#3C2A21]">Purchase Orders</h2>
          <p className="text-xs text-amber-900/70 font-medium">{purchaseOrders.length} orders in pipeline</p>
        </div>
        {can('purchase_orders', 'add') && (
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 font-extrabold text-xs shadow-lg shadow-amber-950/20 hover:brightness-110 active:scale-95 transition-all"
          >
            + New Purchase Order
          </button>
        )}
      </div>

      <InboxPanel />



      <div className="glass-card rounded-3xl border border-white/60 p-6 overflow-hidden">
        <div className="overflow-auto max-h-[520px] rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-amber-900/10 text-amber-900/50 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-3 pr-4">PO Code</th>
                <th className="py-3 pr-4">Supplier</th>
                <th className="py-3 pr-4">Order Date</th>
                <th className="py-3 pr-4">Expected Delivery</th>
                <th className="py-3 pr-4">Total Cost</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Contact</th>
                <th className="py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10 text-xs font-semibold">
              {purchaseOrders.map((po) => (
                <React.Fragment key={po.id}>
                  <tr className="hover:bg-amber-900/5 transition-colors">
                    <td className="py-3.5 pr-4 font-extrabold text-[#3C2A21]">{po.id}</td>
                    <td className="py-3.5 pr-4 font-bold text-amber-900/85">{po.supplier}</td>
                    <td className="py-3.5 pr-4 text-amber-900/55">{po.date}</td>
                    <td className="py-3.5 pr-4 text-amber-900/55">{po.expectedDelivery}</td>
                    <td className="py-3.5 pr-4 font-extrabold text-[#3C2A21]">${po.totalCost.toFixed(2)}</td>
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${po.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                          : po.status === 'In Transit' ? 'bg-blue-500/10 text-blue-800 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-900 border-amber-500/20'
                          }`}>{po.status}</span>
                        {(() => {
                          const latest = latestAnalysisForPo(po);
                          if (!latest || latest.verdict === 'unclear') return null;
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${VERDICT_STYLES[latest.verdict] || VERDICT_STYLES.unclear}`}>
                              {VERDICT_LABELS[latest.verdict] || latest.verdict}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <MessageMenu
                        expanded={messageMenuOpen === po.id}
                        onToggle={() => setMessageMenuOpen(messageMenuOpen === po.id ? null : po.id)}
                        onView={() => { setMessageMenuOpen(null); setExpandedPo(expandedPo === po.id ? null : po.id); }}
                        onChat={() => { setMessageMenuOpen(null); openChat(po); }}
                        onSend={() => { setMessageMenuOpen(null); handleSendEmail(po, po.supplierEmail); }}
                        sending={sendingId === po.id}
                        sent={sentPoIds.includes(po.id)}
                        onCopy={async () => {
                          setMessageMenuOpen(null);
                          try {
                            await navigator.clipboard.writeText(buildMessageFor(po));
                          } catch (err) {
                            console.warn('Copy failed', err);
                          }
                        }}
                        unseenCount={msgsForPo(po).filter(m => !seenMsgIds.includes(m.id)).length}
                      />
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        {can('purchase_orders', 'edit') && (
                          <button
                            type="button"
                            onClick={() => openEdit(po)}
                            title="Edit purchase order"
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-800 hover:bg-blue-600/20 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {can('purchase_orders', 'delete') && (
                          <button
                            type="button"
                            onClick={() => setDeletingPo(po)}
                            title="Delete purchase order"
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedPo === po.id && (
                    <tr>
                      <td colSpan={8} className="py-3 px-4">
                        <pre className="whitespace-pre-wrap text-[11px] font-medium text-[#3C2A21] bg-[#FFFDF9]/80 border border-amber-900/10 rounded-xl p-3">
                          {buildMessageFor(po)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sendMsg && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${sendMsg.includes('✓') ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' : 'bg-amber-500/10 text-amber-900 border-amber-500/20'
          }`}>
          {sendMsg}
        </div>
      )}

      {confirmPo && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md glass-card rounded-3xl overflow-hidden border border-white/60 animate-scaleIn shadow-2xl">
              <div className="px-6 py-5 bg-gradient-to-r from-[#FFF9F2] to-white border-b border-amber-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C08552] to-[#693F27] text-amber-50 flex items-center justify-center shadow-md shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Confirm Purchase Order</h3>
                    <p className="text-[11px] font-semibold text-amber-900/60">Review before issuing</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-3">
                <div className="rounded-2xl bg-[#FFFDF9]/80 border border-amber-900/10 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">PO Code</span>
                    <span className="text-sm font-extrabold text-[#3C2A21]">{confirmPo.po.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Supplier</span>
                    <span className="text-sm font-bold text-[#693F27]">{confirmPo.po.supplier}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Order Date</span>
                    <span className="text-sm font-bold text-amber-900/70">{confirmPo.po.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Expected Delivery</span>
                    <span className="text-sm font-bold text-amber-900/70">{confirmPo.po.expectedDelivery}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Total Cost</span>
                    <span className="text-sm font-extrabold text-[#3C2A21]">${confirmPo.po.totalCost.toFixed(2)}</span>
                  </div>
                  {confirmPo.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900/50">Send To</span>
                      <span className="text-xs font-bold text-emerald-800 truncate max-w-[180px]">{confirmPo.email}</span>
                    </div>
                  )}
                  {!confirmPo.email && (
                    <p className="text-[11px] font-bold text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      No email on file for {confirmPo.po.supplier}. Add it in Inventory &gt; Suppliers.
                    </p>
                  )}
                </div>

                <p className="text-[11px] font-semibold text-amber-900/60 leading-relaxed">
                  {confirmPo.email
                    ? `Issue ${confirmPo.po.id} and send the order email to ${confirmPo.po.supplier}?`
                    : 'Issue this purchase order? The supplier has no email on file, so it will not be emailed.'}
                </p>
              </div>

              <div className="px-6 py-4 bg-[#FFF9F2]/60 border-t border-amber-900/10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={confirmSend}
                  disabled={sendingId === confirmPo.po.id}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 text-xs font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {sendingId === confirmPo.po.id ? 'Sending...' : confirmPo.email ? 'Send Email & Issue Order' : 'Issue Order'}
                </button>
                <div className="flex gap-2">
                  {confirmPo.email && (
                    <button
                      type="button"
                      onClick={confirmWithoutSend}
                      className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-[#693F27] text-xs font-bold hover:bg-amber-900/20 transition-colors"
                    >
                      Issue Without Sending
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmPo(null)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {chatPo && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl glass-card rounded-3xl overflow-hidden border border-white/60 animate-scaleIn max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-amber-900/10 flex items-center justify-between gap-3 bg-gradient-to-r from-[#FFF9F2] to-white">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C08552] to-[#693F27] text-amber-50 text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm uppercase">
                    {initials(chatPo.supplier)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-extrabold text-lg text-[#3C2A21] truncate">{chatPo.supplier} · {chatPo.id}</h3>
                    <p className="text-[11px] font-semibold text-amber-900/60 truncate">
                      {chatPo.supplierEmail ? chatPo.supplierEmail : 'No email on file'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={scanInbox}
                    disabled={refreshingMsgs}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/20 transition-colors disabled:opacity-50"
                  >
                    {refreshingMsgs ? 'Scanning...' : 'Scan Inbox Now'}
                  </button>
                  <button
                    type="button"
                    onClick={refreshMessages}
                    disabled={refreshingMsgs}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-900/10 text-[#693F27] hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                  >
                    Refresh Replies
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChatPo(null); setChatMsg(''); }}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-700 hover:bg-red-500/20 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FFF9F2]/60">
                {(() => {
                  const sent = supplierEmailParts(chatPo, chatPo.supplierEmail);
                  const poMsgs = supplierMessages
                    .filter(m => normalizePoCode(m.po_code) === normalizePoCode(chatPo.id))
                    .slice()
                    .sort((a, b) => new Date(a.parsed_at) - new Date(b.parsed_at));
                  return (
                    <>
                      <ChatBubble side="out" sender="You" time={chatPo.date} subject={sent.subject}>
                        {sent.body}
                      </ChatBubble>

                      {poMsgs.map((m) => {
                        let items = [];
                        if (typeof m.matched_items === 'string') {
                          try { items = JSON.parse(m.matched_items) || []; } catch { items = []; }
                        } else if (Array.isArray(m.matched_items)) {
                          items = m.matched_items;
                        }
                        const isOut = m.direction === 'out';
                        const repliedTo = m.in_reply_to
                          ? poMsgs.find(x => x.gmail_message_id === m.in_reply_to)
                          : null;
                        return (
                          <ChatBubble
                            key={m.id}
                            side={isOut ? 'out' : 'in'}
                            sender={isOut ? 'You' : m.from_email || chatPo.supplier}
                            time={m.parsed_at ? new Date(m.parsed_at).toLocaleString() : ''}
                            subject={m.subject}
                            quote={isOut && repliedTo ? {
                              sender: parseName(repliedTo.from_email) || chatPo.supplier,
                              text: stripQuotedReply(repliedTo.body) || repliedTo.subject || '(original message)',
                            } : null}
                          >
                            {stripQuotedReply(m.body)}
                            {items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {items.map((it, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-500/10 text-emerald-800 border-emerald-500/20">
                                    {it.quantity} {it.unit} · {it.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </ChatBubble>
                        );
                      })}

                      {poMsgs.length === 0 && (
                        <p className="text-xs text-amber-900/40 font-medium text-center py-6">
                          No supplier replies scanned yet. Connect Gmail and hit "Scan Inbox Now", or refresh replies above.
                        </p>
                      )}

                      {(() => {
                        const latest = latestAnalysisForPo(chatPo);
                        if (!latest || latest.verdict === 'unclear') return null;
                        const provided = latest.analysis?.providedItems || [];
                        const missing = latest.analysis?.missingItems || [];
                        const alreadyStocked = Boolean(latest.message?.stocked_at);
                        const remainingMap = remainingForPo(chatPo);
                        // Items previously stocked on this PO (receivedQty > 0)
                        // that the LATEST reply now lists as missing/unavailable.
                        const missingNames = new Set((missing || []).map(m => String(m.name || '').toLowerCase()));
                        const contradicted = (Object.values(remainingMap) || []).filter(info =>
                          info.receivedQty > 0 && missingNames.has(String(info.name).toLowerCase())
                        );
                        // Cap each provided quantity at the balance still owed so
                        // previously-stocked partial deliveries are reflected.
                        const capped = provided.map(it => {
                          const info = remainingMap[String(it.name || '').toLowerCase()];
                          if (!info) return { ...it, cappedQty: null, full: true };
                          return {
                            ...it,
                            cappedQty: Math.min(parseFloat(it.quantity) || 0, info.remaining),
                            full: (parseFloat(it.quantity) || 0) <= info.remaining,
                            remaining: info.remaining,
                          };
                        });
                        const anyCapped = capped.some(c => !c.full);
                        // Everything the reply offers is already fully received on
                        // this PO (e.g. stocked earlier from the scan alert modal),
                        // so the Approve & Stock button must not be clickable.
                        const allProvidedReceived = provided.length > 0 &&
                          capped.every(c => (c.cappedQty ?? 0) <= 0);
                        return (
                          <div className="rounded-2xl border border-amber-900/10 bg-white/70 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#3C2A21]">
                                Scan result
                              </p>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${VERDICT_STYLES[latest.verdict] || VERDICT_STYLES.unclear}`}>
                                {VERDICT_LABELS[latest.verdict] || latest.verdict}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-amber-900/70">
                              {provided.length} of {latest.analysis?.totalCount || 0} ordered item(s) matched in the reply.
                            </p>
                            {contradicted.length > 0 && (
                              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 space-y-2">
                                <p className="text-[11px] font-extrabold text-red-700 uppercase tracking-wide">
                                  ⚠️ Stock was taken, then supplier said unavailable
                                </p>
                                <p className="text-[10px] font-semibold text-red-700/90">
                                  You already stocked {contradicted.map(c => `${c.name} (${c.receivedQty} ${c.unit})`).join(', ')} for this PO, but the latest reply lists it as missing/unavailable.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleReverseStock(chatPo)}
                                  disabled={reversingId === chatPo.id}
                                  className="w-full px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                                >
                                  {reversingId === chatPo.id ? 'Reversing...' : `Reverse Stock & Reopen PO (${contradicted.length})`}
                                </button>
                              </div>
                            )}
                            {provided.length > 0 && (
                              <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1">Will provide</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {capped.map((it, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-500/10 text-emerald-800 border-emerald-500/20">
                                      {it.full ? `${it.quantity} ${it.unit} · ${it.name}`
                                        : it.cappedQty <= 0
                                          ? `${it.name} (already received)`
                                          : `${it.cappedQty} ${it.unit} · ${it.name} (${it.quantity} offered)`}
                                    </span>
                                  ))}
                                </div>
                                {anyCapped && (
                                  <p className="text-[10px] font-semibold text-amber-700 mt-1.5">
                                    Quantities capped to the remaining balance still owed on this PO.
                                  </p>
                                )}
                              </div>
                            )}
                            {missing.length > 0 && (
                              <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 mb-1">Missing</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {missing.map((it, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-red-500/10 text-red-700 border-red-500/20">
                                      {it.quantity} {it.unit} · {it.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {provided.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleApproveStock(chatPo)}
                                disabled={stockingId === chatPo.id || alreadyStocked || allProvidedReceived}
                                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                              >
                                {stockingId === chatPo.id ? 'Stocking...'
                                  : (alreadyStocked || allProvidedReceived) ? 'Stocked ✓'
                                    : 'Approve & Stock Provided Items'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>

              <div className="px-5 py-4 border-t border-amber-900/10 bg-white/60">
                {chatMsg && (
                  <div className={`mb-2 p-2 rounded-lg border text-[11px] font-bold ${chatMsg.includes('✓') ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' : 'bg-amber-500/10 text-amber-900 border-amber-500/20'
                    }`}>
                    {chatMsg}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    rows={2}
                    placeholder={`Reply to ${chatPo.supplier}...`}
                    className="flex-1 px-3 py-2 text-xs rounded-xl glass-input font-semibold text-[#3C2A21] resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendReply(chatPo)}
                    disabled={sendingReply || !chatInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {sendingReply ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn max-h-[90vh] overflow-y-auto">
              <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">New Purchase Order</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Select Supplier</label>
                  <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]">
                    {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={poDeliveryDate}
                    onChange={(e) => setPoDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider">Order Items</label>
                    <span className="text-[10px] font-bold text-amber-900/50">{orderedItems.length} item(s) · ${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-amber-900/10 divide-y divide-amber-900/10">
                    {ingredients.length === 0 && (
                      <p className="text-xs text-amber-900/40 font-medium text-center py-4">No ingredients in inventory to order.</p>
                    )}
                    {ingredients.map((ing) => {
                      const qty = poItems[String(ing.id)] || 0;
                      const lowStock = ing.status === 'Low Stock' || ing.status === 'Out of Stock';
                      return (
                        <div key={ing.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#3C2A21] truncate">{ing.name}</p>
                            <p className="text-[10px] font-semibold text-amber-900/55">
                              Stock: {ing.stock} {ing.unit}
                              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${lowStock ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'
                                }`}>{ing.status}</span>
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-amber-900/45 whitespace-nowrap">${ing.costPerUnit.toFixed(2)}/{ing.unit}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={qty}
                            onChange={(e) => handleQtyChange(ing.id, e.target.value)}
                            className="w-20 px-2.5 py-1.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {orderedItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider">Auto-Generated Message</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={sendingId === 'draft'}
                          onClick={() => handleSendEmail(draftPo, suppliers.find(s => s.name === poSupplier)?.email)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#3C2A21] text-amber-100 hover:brightness-110 transition-colors disabled:opacity-50"
                        >
                          {sendingId === 'draft' ? 'Sending...' : 'Send Email'}
                        </button>
                        <CopyButton text={buildSupplierMessage(draftPo, suppliers.find(s => s.name === poSupplier)?.email)} />
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-[11px] font-medium text-[#3C2A21] bg-[#FFFDF9]/80 border border-amber-900/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                      {buildSupplierMessage(draftPo, suppliers.find(s => s.name === poSupplier)?.email)}
                    </pre>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 rounded-xl bg-[#3C2A21]/5 border border-amber-900/10">
                  <span className="text-xs font-bold text-[#4A2E2A] uppercase tracking-wider">Total Cost</span>
                  <span className="text-base font-extrabold text-[#3C2A21]">${totalCost.toFixed(2)}</span>
                </div>

                {nonOrdered.length === ingredients.length && ingredients.length > 0 && (
                  <p className="text-[10px] font-semibold text-amber-900/40 text-center">Set a quantity on at least one item to place the order.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15">Cancel</button>
                  <button type="submit" disabled={orderedItems.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-[#3C2A21] text-amber-100 text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50">Issue Purchase Order</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {editingPo && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl glass-card rounded-3xl p-6 space-y-4 border border-white/60 animate-scaleIn max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading font-extrabold text-xl text-[#3C2A21]">Edit Purchase Order</h3>
                  <p className="text-[11px] font-semibold text-amber-900/60">{editingPo.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPo(null)}
                  className="w-8 h-8 rounded-full bg-red-500/10 text-red-700 text-sm font-bold hover:bg-red-500/20 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Supplier</label>
                <select value={editSupplier} onChange={handleEditSupplier}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]">
                  {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider mb-1.5">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl glass-input font-semibold text-[#3C2A21]">
                    <option>Pending Approval</option>
                    <option>In Transit</option>
                    <option>Delivered</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-[#4A2E2A] uppercase tracking-wider">Order Items</label>
                  <span className="text-[10px] font-bold text-amber-900/50">
                    {editItems.length} item(s) · ${editItems.reduce((sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.costPerUnit) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {editItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl bg-[#FFFDF9]/80 border border-amber-900/10 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#3C2A21] truncate">{it.name}</p>
                        <p className="text-[10px] font-semibold text-amber-900/50">${(parseFloat(it.costPerUnit) || 0).toFixed(2)} / {it.unit}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={it.qty}
                        onChange={(e) => handleEditItemQty(idx, e.target.value)}
                        className="w-20 px-2.5 py-1.5 text-xs rounded-xl glass-input font-bold text-[#3C2A21]"
                      />
                      <span className="w-20 text-right text-xs font-extrabold text-[#3C2A21]">
                        ${((parseFloat(it.qty) || 0) * (parseFloat(it.costPerUnit) || 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {editItems.length === 0 && (
                    <p className="text-[11px] font-semibold text-amber-900/40">No items on this purchase order.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[#3C2A21]/5 border border-amber-900/10">
                <span className="text-xs font-bold text-[#4A2E2A] uppercase tracking-wider">Total Cost</span>
                <span className="text-base font-extrabold text-[#3C2A21]">
                  ${editItems.reduce((sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.costPerUnit) || 0), 0).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingPo(null)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-xs font-bold text-[#3C2A21] hover:bg-amber-900/15">Cancel</button>
                <button type="button" onClick={saveEdit} disabled={editBusy}
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50">
                  {editBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deletingPo && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md glass-card rounded-3xl overflow-hidden border border-white/60 animate-scaleIn shadow-2xl">
              <div className="px-6 py-5 bg-gradient-to-r from-[#FFF9F2] to-white border-b border-amber-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-500/15 text-red-600 flex items-center justify-center shadow-md shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Delete Purchase Order</h3>
                    <p className="text-[11px] font-semibold text-amber-900/60">This cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="text-xs font-semibold text-amber-900/70 leading-relaxed">
                  Are you sure you want to delete <span className="font-extrabold text-[#3C2A21]">{deletingPo.id}</span> for <span className="font-extrabold text-[#3C2A21]">{deletingPo.supplier}</span>? This will permanently remove the purchase order and its message history.
                </p>
              </div>

              <div className="px-6 py-4 bg-[#FFF9F2]/60 border-t border-amber-900/10 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingPo(null)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-900/10 text-[#693F27] text-xs font-bold hover:bg-amber-900/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteBusy}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {deleteBusy ? 'Deleting...' : 'Delete Order'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}