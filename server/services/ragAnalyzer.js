// Hybrid analyzer: uses Ollama (local) as the primary LLM, falling back to
// Gemini (free tier) when a key is set, with the rule-based analyzer as the
// automatic final fallback (handled by the caller). Activates automatically
// when Ollama is reachable or GEMINI_API_KEY is set in .env.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Simple rate guard: never call the API more than once per N ms, and back off
// on 429 (rate limited) responses so a burst can't trip the free-tier caps.
let lastCallAt = 0;
const MIN_INTERVAL_MS = 2000;
let cooldownUntil = 0;
const COOLDOWN_MS = 60000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cached reachability so we don't ping Ollama on every single message.
let ollamaReachable = null;
const checkOllama = async () => {
  if (ollamaReachable !== null) return ollamaReachable;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    ollamaReachable = res.ok;
  } catch {
    ollamaReachable = false;
  }
  return ollamaReachable;
};

export const ragConfigured = async () => {
  if (await checkOllama()) return true;
  return Boolean(GEMINI_API_KEY);
};

const SYSTEM_PROMPT = `You are a purchase-order assistant for a coffee shop. You read supplier email replies and decide whether the supplier agreed to the purchase order, rejected it, or can only provide some of the items.

IMPORTANT: Only the NEW SUPPLIER REPLY BODY matters. It is the supplier's LATEST message and it overrides anything said earlier. Do NOT assume the supplier agreed just because a previous message in the conversation sounded positive. Base your verdict only on what the NEW SUPPLIER REPLY BODY says.

IMPORTANT: The supplier may write in TAGALOG/FILIPINO. Interpret the meaning regardless of language. Examples:
- "Sige." / "Sige, magpapadala ako" / "Opo" / "Oo" = YES, they agree and will send.
- "Bukas ko ipapadala" / "Ipapadala ko ngayon" = will send soon/tomorrow -> agreed.
- "Wala na kaming stock" / "Ubos na" / "Sold out" / "Hindi na available" = OUT OF STOCK -> rejected.
- "Konti lang ang meron kami" / "Hindi lahat" / "Kulang kami" = only some -> partial.

Rules:
- "agreed"  = the latest message confirms/accepts the whole order and will deliver (nearly) all items.
- "partial" = the latest message says the supplier will provide only some items, or reduced quantities, or mentions delays/backorders for part of the order.
- "rejected"= the latest message declines, cancels, cannot fulfill, or says out of stock.
- "unclear" = you cannot confidently decide.

For "providedItems", list only ordered items the supplier says they WILL deliver in the latest message (use the order's item names). For "missingItems", list ordered items NOT provided. If the latest message says everything is out of stock / cannot deliver, providedItems must be empty and all ordered items go to missingItems.

Reply with JSON only, no markdown, matching exactly:
{
  "verdict": "agreed" | "partial" | "rejected" | "unclear",
  "providedItems": [{ "name": string, "quantity": number, "unit": string }],
  "missingItems": [{ "name": string, "quantity": number, "unit": string }],
  "reasons": [string]
}`;

const parseJson = (text) => {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Model sometimes wraps the JSON in prose — extract the first {...} block.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        throw new Error('LLM response is not valid JSON');
      }
    }
    throw new Error('LLM response is not valid JSON');
  }
};

const normalizeResult = (parsed, orderedItems) => {
  const validVerdicts = ['agreed', 'partial', 'rejected', 'unclear'];
  const verdict = validVerdicts.includes(parsed.verdict) ? parsed.verdict : 'unclear';

  const providedItems = Array.isArray(parsed.providedItems)
    ? parsed.providedItems.filter((it) => it && it.name)
    : [];
  const missingItems = Array.isArray(parsed.missingItems)
    ? parsed.missingItems.filter((it) => it && it.name)
    : [];

  // A plain affirmative reply ("yes", "sige", "okay, will send") should not
  // end up as "agreed" with every ordered item listed as missing. Surface the
  // whole order as provided in that case.
  if (verdict === 'agreed' && providedItems.length === 0) {
    providedItems.push(...(orderedItems || []).map(o => ({
      name: o.name || o.itemName || '',
      quantity: o.qty != null ? o.qty : o.quantity,
      unit: o.unit || '',
    })));
    missingItems.length = 0;
  }

  return {
    verdict,
    providedItems,
    missingItems,
    matchedCount: providedItems.length,
    totalCount: (orderedItems || []).length,
    hints: null,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    source: 'llm',
  };
};

const callOllama = async ({ subject, body, orderedItems }) => {
  const userText = buildUserText({ subject, body, orderedItems });
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 1024 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.message?.content;
  if (!text) {
    throw new Error('Ollama returned empty response');
  }
  return parseJson(text);
};

const callGemini = async ({ subject, body, orderedItems }) => {
  if (!GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY configured');

  const now = Date.now();
  if (now < cooldownUntil) {
    throw new Error('Gemini rate-limit cooldown active');
  }
  const delay = Math.max(0, lastCallAt + MIN_INTERVAL_MS - now);
  if (delay > 0) await wait(delay);
  lastCallAt = Date.now();

  const userText = buildUserText({ subject, body, orderedItems });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }, { text: userText }] },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (response.status === 429) {
    cooldownUntil = Date.now() + COOLDOWN_MS;
    throw new Error('Gemini rate limited (429), cooling down');
  }
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }
  return parseJson(text);
};

const buildUserText = ({ subject, body, orderedItems }) => {
  const orderedList = (orderedItems || [])
    .map((it, idx) => `${idx + 1}. ${it.name || ''}: ${it.qty != null ? it.qty : it.quantity} ${it.unit || ''}`)
    .join('\n');

  return [
    `ORDERED ITEMS:`,
    orderedList || '(none)',
    `\nNEW SUPPLIER REPLY SUBJECT: ${subject || ''}`,
    `NEW SUPPLIER REPLY BODY (this is the LATEST message from the supplier — base your verdict ONLY on this):`,
    body || '(empty)',
  ].join('\n');
};

/**
 * Analyze a supplier reply using a local LLM (Ollama first, then Gemini if a
 * key is set). Throws on any failure so the caller can fall back to the
 * rule-based analyzer.
 * @returns {Promise<{verdict: string, providedItems: Array, missingItems: Array,
 *                    matchedCount: number, totalCount: number, hints: null, reasons: string[], source: string}>}
 */
export const analyzeSupplierReplyWithRag = async ({
  body = '',
  subject = '',
  orderedItems = [],
}) => {
  const args = { body, subject, orderedItems };

  if (await checkOllama()) {
    try {
      const parsed = await callOllama(args);
      return normalizeResult(parsed, orderedItems);
    } catch (err) {
      console.warn(`Ollama analysis failed (${err.message}), trying Gemini`);
    }
  }

  if (GEMINI_API_KEY) {
    const parsed = await callGemini(args);
    return normalizeResult(parsed, orderedItems);
  }

  throw new Error('No LLM available (Ollama unreachable and no GEMINI_API_KEY set)');
};
