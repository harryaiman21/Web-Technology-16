const path = require('path');
const fs = require('fs');

const jsonServer = require('json-server');
const express = require('express');
const multer = require('multer');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
/** Incident summary length cap (words) for LLM + API response. */
const SUMMARY_MAX_WORDS = 30;

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use(cors());
server.use(middlewares);
server.use(jsonServer.bodyParser);

function getFetch() {
  if (typeof fetch === 'function') return fetch;
  // eslint-disable-next-line global-require
  return require('node-fetch');
}

function clampToAllowed(value, allowed, fallback = '') {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  const hit = allowed.find((a) => String(a).trim().toLowerCase() === normalized);
  return hit || fallback;
}

function clampPriority(value) {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'low') return 'Low';
  return 'Medium';
}

/** LLM / UI summary: at most `maxWords` words. */
function clampSummaryWords(text, maxWords = SUMMARY_MAX_WORDS) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words.slice(0, maxWords).join(' ');
}

function normalizeTags(tags, max = 10) {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .slice(0, max);
  const out = [];
  const seen = new Set();
  for (const t of cleaned) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Customer-complaint categories only (not channel / not product-specific labels). */
const COMPLAINT_TAGS = ['Price Error', 'Late Delivery', 'Damaged Parcel', 'Wrong Address', 'Others'];
const COMPLAINT_LOWER = new Map(COMPLAINT_TAGS.map((t) => [t.toLowerCase(), t]));
const DISALLOWED_TAG_LOWERCASE = new Set([
  'email',
  'whatsapp',
  'teams',
  'image',
  'screenshot',
  'handwriting instruction',
  'customer complaints',
]);

/** Map LLM or noisy tags to the fixed complaint set; drop channel-as-tag and vague product titles. */
function toComplaintOnlyTags(tags) {
  const cleaned = normalizeTags(tags, 10);
  const out = [];
  for (const raw of cleaned) {
    const low = raw.toLowerCase();
    if (!low || DISALLOWED_TAG_LOWERCASE.has(low)) continue;
    const exact = COMPLAINT_LOWER.get(low);
    if (exact) {
      out.push(exact);
      continue;
    }
    if (/(damage|broken|crush|dent|destroy|ripped|leak|parcel damage)/i.test(low)) out.push('Damaged Parcel');
    else if (/(wrong address|incorrect address|address change|misdeliver|wrong delivery)/i.test(low)) {
      out.push('Wrong Address');
    } else if (/(^|[^a-z])(price|cod|refund|billing|invoice|overcharge|fee error|payment error|charged wrong)([^a-z]|$)/i.test(low)) {
      out.push('Price Error');
    } else if (/(late|delay|not delivered|slow delivery|behind schedule)/i.test(low)) out.push('Late Delivery');
  }
  if (out.length === 0) return ['Others'];
  const dedup = [];
  const seen = new Set();
  for (const t of out) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(t);
  }
  return dedup.slice(0, 5);
}

/** Parse JSON from Ollama output (markdown fences / extra prose tolerated). */
function parseJsonFromLLMOutput(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const candidates = [s];
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(s.slice(first, last + 1));
  for (const chunk of candidates) {
    try {
      return JSON.parse(chunk);
    } catch {}
  }
  return null;
}

async function ollamaListModels() {
  const fetchImpl = getFetch();
  const url = `${OLLAMA_URL.replace(/\/+$/, '')}/api/tags`;
  const resp = await fetchImpl(url, { method: 'GET' });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Ollama /api/tags failed (${resp.status}): ${t}`);
  }
  const data = await resp.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models.map((m) => m?.name).filter(Boolean);
}

async function ollamaSmokeGenerate() {
  const fetchImpl = getFetch();
  const url = `${OLLAMA_URL.replace(/\/+$/, '')}/api/generate`;
  const resp = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt:
        'Return JSON only: {"ok": true}. No extra keys, no markdown, no text outside JSON.',
      stream: false,
      format: 'json',
      options: { temperature: 0, num_ctx: 256 },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Ollama /api/generate failed (${resp.status}): ${t}`);
  }
  const data = await resp.json();
  const raw = data?.response || '';
  const parsed = JSON.parse(raw);
  if (!parsed?.ok) throw new Error('Ollama smoke test returned unexpected JSON.');
  return true;
}

const publicDir = path.join(__dirname, 'public');
const attachmentsDir = path.join(publicDir, 'attachments');
fs.mkdirSync(attachmentsDir, { recursive: true });
server.use('/attachments', express.static(attachmentsDir));
server.use('/public', express.static(publicDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, attachmentsDir),
  filename: (_req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^\w.\-() ]+/g, '_');
    const stamp = Date.now();
    cb(null, `${stamp}-${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

server.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
  }

  return res.status(201).json({
    name: req.file.originalname,
    type: req.file.mimetype,
    url: `/attachments/${req.file.filename}`,
    size: req.file.size,
  });
});

server.get('/llm/health', async (_req, res) => {
  try {
    const models = await ollamaListModels();
    const hasModel = models.some((m) => String(m).toLowerCase() === String(OLLAMA_MODEL).toLowerCase());
    if (hasModel) {
      await ollamaSmokeGenerate();
    }
    return res.json({
      ok: true,
      provider: 'ollama',
      ollamaUrl: OLLAMA_URL,
      ollamaModel: OLLAMA_MODEL,
      modelInstalled: hasModel,
      models,
    });
  } catch (e) {
    return res.status(503).json({
      ok: false,
      provider: 'ollama',
      error: e?.message || 'LLM health check failed',
    });
  }
});

server.post('/incident/classify', async (req, res) => {
  try {
    const {
      text = '',
      availableTags = [],
      availableSources = [],
    } = req.body || {};

    const inputText = String(text || '').trim();
    if (!inputText) {
      return res.status(400).json({ error: 'Missing text to classify.' });
    }

    const allowedSources = Array.isArray(availableSources) && availableSources.length > 0
      ? availableSources
      : ['Email', 'Google Drive', 'WhatsApp', 'Teams', 'Image', 'Screenshot', 'Handwriting instruction', 'Other'];

    const allowedTags =
      Array.isArray(availableTags) && availableTags.length > 0 ? availableTags : COMPLAINT_TAGS;

    const prompt = [
      'You are helping categorize a DHL incident report into an existing form.',
      'Return ONLY valid JSON matching the provided schema.',
      '',
      'Rules:',
      '- Keep title short (max 80 chars).',
      '- source must be one of the provided sources; if unsure pick "Other".',
      '- tags must be ONLY customer-complaint categories from the provided list (e.g. Price Error, Late Delivery, Damaged Parcel, Wrong Address, Others).',
      '- Never use channel or medium names as tags (no Email, WhatsApp, Teams, etc.); put channel only in source.',
      '- Never use product-specific or story-specific labels as tags (no "Damaged Coffee Machine"); pick the broad complaint bucket instead.',
      '- description should be a concise summary (max 600 chars) based on the text.',
      '- priority must be exactly one of: High, Medium, Low.',
      '- Use Low when impact is mild or operational-only, for example: slightly damaged, minor delay, tracking not updated promptly, small inconvenience, or low customer harm — no major financial loss, safety risk, or widespread outage.',
      '- Use Medium for typical customer-impacting issues that need timely handling but are not severe or catastrophic.',
      '- Use High for major injury or loss, legal/regulatory risk, widespread service failure, or severe repeated customer harm.',
      '- summary must be fluent, grammatically correct English in a neutral incident-reporting tone.',
      `- summary is REQUIRED: never leave it empty. At most ${SUMMARY_MAX_WORDS} words (hard cap). One or two sentences. State the customer issue clearly; do not use only a product name or title.`,
      '- If unsure, still write a short neutral summary from the text.',
      '',
      `Available sources: ${JSON.stringify(allowedSources)}`,
      `Available tags: ${JSON.stringify(allowedTags)}`,
      '',
      'Text to categorize:',
      inputText.slice(0, 8000),
    ].join('\n');

    const fetchImpl = getFetch();
    const url = `${OLLAMA_URL.replace(/\/+$/, '')}/api/generate`;
    const resp = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
          num_ctx: 8192,
          num_predict: 1024,
        },
      }),
    });

    if (!resp.ok) {
      const textErr = await resp.text();
      const status = resp.status || 502;
      return res.status(status).json({
        error: 'Ollama API error',
        status,
        details: textErr,
      });
    }

    const data = await resp.json();
    const raw = data?.response || '';

    let parsed = parseJsonFromLLMOutput(raw);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({ error: 'Failed to parse LLM JSON output', raw, provider: 'ollama' });
    }

    const title = String(parsed?.title || '').trim().slice(0, 80);
    const source = clampToAllowed(parsed?.source, allowedSources, 'Other');
    const tags = toComplaintOnlyTags(parsed?.tags);
    const description = String(parsed?.description || '').trim().slice(0, 600);
    const priority = clampPriority(parsed?.priority);
    const summaryFromModel = String(parsed?.summary ?? '').trim();
    let summary = clampSummaryWords(summaryFromModel, SUMMARY_MAX_WORDS);
    if (!summary) summary = clampSummaryWords(description, SUMMARY_MAX_WORDS);
    if (!summary) summary = clampSummaryWords(inputText, SUMMARY_MAX_WORDS);
    const confidence = typeof parsed?.confidence === 'number' ? parsed.confidence : undefined;

    return res.json({ title, source, tags, description, priority, summary, confidence });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unknown server error' });
  }
});

server.use(router);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`JSON Server running on http://localhost:${PORT}`);
});

