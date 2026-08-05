// Rule-based analyzer for supplier replies.
// Decides whether a supplier agreed to a purchase order and which
// ordered items they will provide, by matching the reply text against
// the items originally ordered on the PO.

const POSITIVE_HINTS = [
  'confirmed', 'confirm', 'approved', 'approve', 'accept', 'accepted',
  'we will deliver', 'will deliver', 'on its way', 'on the way', 'shipped',
  'we can supply', 'can supply', 'available', 'in stock', 'order confirmed',
  'as requested', 'everything you ordered', 'all items', 'all the items',
  'yes', 'great news', 'good news', 'we got your order', 'ready to ship',
  'will ship', 'processing your order', 'thank you for your order',
  'delivery scheduled', 'scheduled for delivery',
];

const NEGATIVE_HINTS = [
  'sorry', 'unfortunately', 'unavailable', 'out of stock', 'cannot', "can't",
  'unable', 'reject', 'rejected', 'cancelled', 'cancel', 'do not have',
  "don't have", 'no longer', 'discontinued', 'backorder', 'will not be able',
  'not available', 'apologise', 'apologize', 'failed', 'unable to fulfill',
  'unable to supply', 'cannot supply', 'only have', 'only have in stock',
  'partial', 'partially', 'short', 'shortage', 'missing', 'weeks',
];

const PARTIAL_HINTS = [
  'partial', 'partially', 'short', 'shortage', 'missing', 'only have',
  'only able', 'we can only', 'unfortunately', 'but', 'however',
  'still waiting', 'backorder', 'will arrive later', 'rest of', 'balance',
];

// Tagalog/Filipino hints. The supplier writes in Tagalog ("Sige. Magpapadala
// ako ngayon bukas" = "Okay, I'll send now/tomorrow", "Wala na kaming stock"
// = "We're out of stock"). These are matched as whole words so short tokens
// like "oo"/"wala" can't false-match inside English words via substring.
const TAGALOG_POSITIVE = [
  'sige', 'sige po', 'opo', 'oo', 'pumayag', 'papayag', 'magpapadala',
  'ipapadala', 'padadalhan', 'kayang', 'kaya ko', 'may stock', 'mayroon',
  'meron', 'bukas', 'bukas na', 'ngayon bukas', 'pumapayag', 'gagawin',
  'ibibigay', 'madadala', 'dadating', 'deliver ko', 'idedeliver', 'ok',
  'okay', 'sige sige',
];

const TAGALOG_NEGATIVE = [
  'wala na kaming', 'wala kaming stock', 'wala na kami', 'ubos na', 'naubos',
  'sold out', 'hindi pwede', 'hindi kaya', 'hindi ko kaya', 'wala akong',
  'hindi available', 'out of stock', 'wala kami', 'paumanhin', 'pasensya',
  'sorry', 'wala na tayong', 'hindi makapagdeliver', 'hindi makapag-deliver',
  'hindi magagawa', 'hindi maibibigay', 'walang stock', 'walang paninda',
];

const TAGALOG_PARTIAL = [
  'ilan lang', 'konti lang', 'bahagya', 'kulang', 'mamaya', 'susunod',
  'sa susunod', 'hindi lahat', 'parte lang', 'kalahati lang',
];

const normalizeText = (text = '') =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Normalize an item name for fuzzy comparison (drop units, quantity, filler words).
const normalizeItemName = (name = '') =>
  normalizeText(name)
    .replace(/\b(kg|g|grams|kgs|liter|l|ml|pcs|pieces|units|bottles|packs|boxes|bags|bundle)\b/g, ' ')
    .replace(/\b(the|and|of|for|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isSubstring = (short, long) => {
  const a = normalizeItemName(short);
  const b = normalizeItemName(long);
  if (!a || !b) return false;
  return a.length >= 3 && (b.includes(a) || a.includes(b));
};

// Token-overlap matcher: "KKK product" vs "kkkk" -> match via shared tokens.
const tokens = (s) => normalizeItemName(s).split(' ').filter(Boolean);
const itemTokensMatch = (name, phrase) => {
  const nt = tokens(name);
  const pt = tokens(phrase);
  if (!nt.length || !pt.length) return false;
  return nt.some(n => pt.some(p =>
    n.length >= 3 && p.length >= 3 && (n.includes(p) || p.includes(n))
  ));
};

// Count how many positive / negative hint phrases appear in the reply.
const scoreHints = (text) => {
  const normalized = normalizeText(text);
  let positive = 0;
  let negative = 0;
  let partial = 0;
  for (const hint of POSITIVE_HINTS) {
    if (normalized.includes(hint)) positive += 1;
  }
  for (const hint of NEGATIVE_HINTS) {
    if (normalized.includes(hint)) negative += 1;
  }
  for (const hint of PARTIAL_HINTS) {
    if (normalized.includes(hint)) partial += 1;
  }
  // Tagalog hints: whole-word matches so "oo"/"wala" don't false-match
  // inside English words. normalizeText keeps [a-z0-9- ] so \b is safe.
  const word = (hint) => new RegExp(`\\b${hint.replace(/\s+/g, '\\s+')}\\b`, 'i');
  for (const hint of TAGALOG_POSITIVE) {
    if (word(hint).test(normalized)) positive += 1;
  }
  for (const hint of TAGALOG_NEGATIVE) {
    if (word(hint).test(normalized)) negative += 1;
  }
  for (const hint of TAGALOG_PARTIAL) {
    if (word(hint).test(normalized)) partial += 1;
  }
  return { positive, negative, partial };
};

/**
 * Detect explicit availability statements in the reply text:
 * - "only X available" / "can only supply X"  -> those items provided, others not
 * - "X not available" / "X out of stock"      -> those items missing
 * - "only N units of X can deliver"           -> provided at a reduced quantity
 */
const parseAvailabilityStatements = (text, orderedItems) => {
  const availableOnly = [];
  const unavailable = [];
  const qtyOverride = {};
  const reasons = [];

  const findItems = (phrase) =>
    (orderedItems || []).filter(o => itemTokensMatch(o.name || '', phrase));

  // Reduced quantity, e.g. "only 2 units of X can deliver" OR
  // "X ... only 2unit" (item named in the same sentence). Matched BEFORE the
  // "only available" patterns so the qty override wins.
  const unitWords = 'kg|kgs|g|grams|gram|gms|l|liter|liters|litre|litres|ml|units?|pcs|pieces|packs|pack|boxes|box|bottles|bags|packs';
  const qtyReductionRe = new RegExp(
    `\\bonly\\s+(?:(?:have|got|can|could|able to|supply|provide|deliver|give|send|ship|is|are)\\s+)*` +
    `(\\d+(?:\\.\\d+)?)\\s*(${unitWords})?\\s*(?:of|for|on)\\s+(.+?)(?:\\.|,|$)`,
    'i'
  );
  const bareQtyRe = new RegExp(`\\bonly\\s+(\\d+(?:\\.\\d+)?)\\s*(${unitWords})\\b`, 'i');

  const applyQty = (qty, unit, itemPhrase) => {
    let matches = itemPhrase ? findItems(itemPhrase) : [];
    if (!matches.length) {
      // Item not named right after the qty — look for an ordered item in the
      // nearby text (e.g. "donut i will deliver is only 2unit").
      const windowStart = Math.max(0, qtyMatch.index - 120);
      const windowEnd = Math.min(text.length, qtyMatch.index + 20);
      matches = (orderedItems || []).filter(o =>
        itemTokensMatch(o.name || '', text.slice(windowStart, windowEnd))
      );
    }
    if (!matches.length && (orderedItems || []).length === 1) {
      matches = orderedItems;
    }
    if (matches.length && qty > 0) {
      matches.forEach(o => { qtyOverride[o.name] = qty; });
      reasons.push(`reduced qty: ${matches.map(x => x.name).join(', ')} to ${qty} ${unit}`.trim());
    }
  };

  let qtyMatch = text.match(qtyReductionRe);
  if (qtyMatch) {
    applyQty(parseFloat(qtyMatch[1]), qtyMatch[2] || '', qtyMatch[3]);
  } else {
    qtyMatch = text.match(bareQtyRe);
    if (qtyMatch) {
      applyQty(parseFloat(qtyMatch[1]), qtyMatch[2] || '', null);
    }
  }

  const onlyAvailPatterns = [
    /\bonly\s+(.+?)\s+(?:is|are|will be)\s+available\b/i,
    /\bonly\s+(.+?)\s+available\b/i,
    /\bavailable\s+(?:is|are)\s+(?:only\s+)?(.+)/i,
    /\bcan\s+only\s+(?:supply|provide|deliver|give|send|ship)\s+(?:the\s+|your\s+)?(.+)/i,
    /\bonly\s+(.+?)\s+(?:can|could|will)\s+(?:supply|provide|deliver|give|send|ship)/i,
  ];
  for (const re of onlyAvailPatterns) {
    const m = text.match(re);
    if (m && m[1] && m[1].trim()) {
      const matches = findItems(m[1]);
      if (matches.length) {
        availableOnly.push(...matches);
        reasons.push(`only available: ${matches.map(x => x.name).join(', ')}`);
        break;
      }
    }
  }

  const notAvailPatterns = [
    /(.+?)\s+(?:is|are)\s+not available\b/i,
    /(.+?)\s+(?:is|are)\s+no longer available\b/i,
    /(.+?)\s+(?:is|are)\s+out of stock\b/i,
    /(.+?)\s+unavailable\b/i,
  ];
  for (const re of notAvailPatterns) {
    const m = text.match(re);
    if (m && m[1] && m[1].trim()) {
      const matches = findItems(m[1]);
      if (matches.length) {
        unavailable.push(...matches);
        reasons.push(`not available: ${matches.map(x => x.name).join(', ')}`);
      }
    }
  }

  return { availableOnly, unavailable, qtyOverride, reasons };
};

/**
 * Compare extracted reply items against the ordered items, applying any
 * explicit availability statements first.
 * Returns which ordered items appear to be provided and which are missing.
 */
const matchItems = (replyItems, orderedItems, statements = {}) => {
  const { availableOnly = [], unavailable = [], qtyOverride = {} } = statements;
  const provided = [];
  const missing = [];
  for (const ordered of orderedItems || []) {
    const orderName = ordered.name || ordered.itemName || '';

    if (unavailable.some(u => u.name === orderName)) {
      missing.push({
        name: orderName,
        quantity: ordered.qty != null ? ordered.qty : ordered.quantity,
        unit: ordered.unit || '',
      });
      continue;
    }

    if (availableOnly.some(a => a.name === orderName)) {
      provided.push({
        name: orderName,
        quantity: qtyOverride[orderName] != null ? qtyOverride[orderName]
          : (ordered.qty != null ? ordered.qty : ordered.quantity),
        unit: ordered.unit || '',
      });
      continue;
    }

    // Reduced quantity implies the supplier IS delivering the item (at a lower
    // amount), even if the name wasn't listed as "only X available".
    if (qtyOverride[orderName] != null) {
      provided.push({
        name: orderName,
        quantity: qtyOverride[orderName],
        unit: ordered.unit || '',
      });
      continue;
    }

    const replyHit = (replyItems || []).find((r) =>
      isSubstring(ordered.name || '', r.name || '')
    );
    if (replyHit) {
      provided.push({
        name: orderName,
        quantity: qtyOverride[orderName] != null ? qtyOverride[orderName]
          : (replyHit.quantity != null ? replyHit.quantity : ordered.qty),
        unit: replyHit.unit || ordered.unit || '',
      });
    } else {
      missing.push({
        name: orderName,
        quantity: ordered.qty != null ? ordered.qty : ordered.quantity,
        unit: ordered.unit || '',
      });
    }
  }
  return { provided, missing };
};

/**
 * Analyze a supplier reply against the items ordered on a PO.
 * @param {object} opts
 * @param {string} opts.body       Reply body text.
 * @param {string} opts.subject    Reply subject line.
 * @param {Array}  opts.orderedItems Items ordered on the PO: [{name, qty, unit, ...}]
 * @param {Array}  opts.replyItems   Items extracted from the reply: [{name, quantity, unit}]
 * @returns {{verdict: string, providedItems: Array, missingItems: Array,
 *            matchedCount: number, totalCount: number, reasons: string[]}}
 */
export const analyzeSupplierReply = ({
  body = '',
  subject = '',
  orderedItems = [],
  replyItems = [],
}) => {
  const cleanBody = stripQuotedReply(`${subject || ''}\n${body || ''}`);
  const { positive, negative, partial } = scoreHints(cleanBody);
  const reasons = [];

  const statements = parseAvailabilityStatements(cleanBody, orderedItems);
  const { provided, missing } = matchItems(replyItems, orderedItems, statements);
  const totalCount = orderedItems.length;
  const matchedCount = provided.length;
  const matchedRatio = totalCount > 0 ? matchedCount / totalCount : 0;

  const hasOnlyAvail = statements.availableOnly.length > 0;
  const hasUnavailable = statements.unavailable.length > 0;
  const hasQtyReduction = Object.keys(statements.qtyOverride).length > 0;
  const allUnavailable = hasUnavailable && statements.unavailable.length >= totalCount;

  reasons.push(...statements.reasons);

  let verdict;
  if (totalCount === 0) {
    verdict = 'unclear';
    reasons.push('no ordered items to compare');
  } else if (allUnavailable) {
    verdict = 'rejected';
    reasons.push('all ordered items unavailable');
  } else if ((hasOnlyAvail && matchedCount < totalCount) || hasUnavailable || hasQtyReduction) {
    verdict = 'partial';
    reasons.push('partial availability detected');
  } else if (matchedRatio >= 0.8) {
    verdict = 'agreed';
    reasons.push('most ordered items matched in reply');
  } else if (matchedRatio > 0) {
    verdict = 'partial';
    reasons.push('some ordered items matched, some missing');
  } else if (negative >= positive && negative > 0) {
    verdict = 'rejected';
    reasons.push('negative intent detected');
  } else if (partial > 0 && positive > 0 && negative === 0) {
    // "Konti lang ang meron kami" / "Yes, but only some" — affirm but
    // limited quantities means the supplier can only fulfill part.
    verdict = 'partial';
    reasons.push('positive intent with limited availability');
  } else if (positive > 0 && negative === 0) {
    verdict = 'agreed';
    reasons.push('positive intent without item-level detail');
  } else if (partial > 0 && negative > 0) {
    verdict = 'partial';
    reasons.push('partial intent signals');
  } else {
    verdict = 'unclear';
    reasons.push('could not confidently classify');
  }

  // A plain affirmative reply ("yes", "sige", "okay, will send") with no
  // item-level detail still means the whole order is being delivered. Surface
  // every ordered item as provided at its ordered quantity instead of showing
  // an "agreed" verdict with everything listed as missing.
  if (verdict === 'agreed' && provided.length === 0 && matchedCount === 0) {
    provided.push(...(orderedItems || []).map(o => ({
      name: o.name || o.itemName || '',
      quantity: o.qty != null ? o.qty : o.quantity,
      unit: o.unit || '',
    })));
    missing.length = 0;
  }

  return {
    verdict,
    providedItems: provided,
    missingItems: missing,
    matchedCount,
    totalCount,
    hints: { positive, negative, partial },
    reasons,
  };
};

// Remove the quoted original message that Gmail/email clients append below a
// reply (e.g. "On <date>, ... wrote:" followed by "> " lines). We only want to
// analyze the NEW text the supplier actually typed.
export const stripQuotedReply = (rawBody) => {
  if (!rawBody) return '';
  const lines = String(rawBody).split(/\r?\n/);
  const cutMarkers = [
    /^On .+ wrote:\s*$/i,
    /^On .+ wrote$/i,
    /^wrote:\s*$/i,
    /^-{2,}\s*Original Message\s*-{2,}/i,
    /^From:\s.+/i,
  ];
  let cutIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // A standalone "wrote:" line is a cut marker only when a preceding line is
    // an "On <date> ..." attribution (the common Gmail quoted-reply layout:
    // "On Sat, Aug 1, 2026, ... \n wrote:").
    if (/^wrote:\s*$/i.test(trimmed)) {
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        if (/^On .+$/i.test(lines[j].trim())) {
          cutIndex = j;
          break;
        }
      }
      if (cutIndex !== lines.length) break;
    }
    if (cutMarkers.some(re => re.test(trimmed))) {
      cutIndex = i;
      break;
    }
  }
  const newLines = lines
    .slice(0, cutIndex)
    .filter(line => !line.trim().startsWith('>'));
  while (newLines.length && newLines[newLines.length - 1].trim() === '') newLines.pop();
  return newLines.join('\n').trim() || String(rawBody).trim();
};
