/**
 * Generate concept prerequisites using 3 tracks:
 * - Track A: structural edges from curated subdomain layer ordering
 * - Track B: LLM batch per subdomain (LM Studio OpenAI-compatible endpoint)
 * - Track C: text reference parsing from explanation/description
 *
 * Usage:
 *   node scripts/build-concept-prerequisites.js --dry-run
 *   node scripts/build-concept-prerequisites.js --apply
 *   node scripts/build-concept-prerequisites.js --layer-config data/concept-subdomain-layers.json --out reports/concept-prereq-suggest.json
 *
 * Optional LLM env:
 *   LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
 *   LM_STUDIO_MODEL=qwen2.5-14b-instruct
 *   LM_STUDIO_API_KEY=lm-studio
 *
 * OpenRouter env:
 *   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
 *   OPENROUTER_API_KEY=sk-or-...
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Concept = require('../features/courses/models/Concept');

const MONGO_URI = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies';
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1';
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || '';
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY || 'lm-studio';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const LAYER_EDGE_CONFIDENCE = 0.35;
const TEXT_REF_CONFIDENCE = 0.6;
const DEFAULT_MIN_EDGE_CONFIDENCE = 0.4;
const DEFAULT_MAX_PREREQS_PER_CONCEPT = 10;

function getArgValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return fallback;
  return process.argv[idx + 1] || fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean))];
}

function normToken(s) {
  return String(s || '').trim().toLowerCase();
}

function parseHttpCodeFromErrorMessage(msg) {
  const text = String(msg || '');
  const m = text.match(/\((\d{3})\)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** LM Studio sometimes returns HTTP 400 when the local engine crashes (OOM, etc.); smaller batches often succeed. */
function isLmStudioRecoverableBatchError(msg) {
  const code = parseHttpCodeFromErrorMessage(msg);
  if (code == null) return false;
  const t = String(msg || '').toLowerCase();
  if (code === 400) {
    return t.includes('crash') || t.includes('exit code') || t.includes('vllm') || t.includes('engine error');
  }
  if (code === 502 || code === 503) {
    return t.includes('oom') || t.includes('out of memory') || t.includes('overload');
  }
  return false;
}

function edgeKey(from, to) {
  return `${from}=>${to}`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractFirstJsonObject(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  const parseAttempts = [];
  parseAttempts.push(candidate);

  const objStart = candidate.indexOf('{');
  const objEnd = candidate.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) {
    parseAttempts.push(candidate.slice(objStart, objEnd + 1));
  }

  const cleanedAttempts = parseAttempts
    .map((s) => s.replace(/,\s*([}\]])/g, '$1'))
    .map((s) => s.replace(/[“”]/g, '"'))
    .map((s) => s.replace(/[‘’]/g, "'"));

  for (const attempt of cleanedAttempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // try next attempt
    }
  }
  return null;
}

function normalizeLlmJsonShape(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const ranking = Array.isArray(parsed.ranking) ? parsed.ranking : [];
  const prerequisites = Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [];
  return { ranking, prerequisites };
}

function toEdgeMap(edgeList) {
  const map = new Map();
  for (const edge of edgeList) {
    const from = String(edge.from || '').trim();
    const to = String(edge.to || '').trim();
    if (!from || !to || from === to) continue;
    const k = edgeKey(from, to);
    const confidence = Number(edge.confidence || 0);
    const source = String(edge.source || '').trim() || 'unknown';
    const reason = String(edge.reason || '').trim();
    if (!map.has(k)) {
      map.set(k, { from, to, confidence, sources: [source], reasons: reason ? [reason] : [] });
      continue;
    }
    const prev = map.get(k);
    prev.confidence = Math.max(prev.confidence, confidence);
    if (!prev.sources.includes(source)) prev.sources.push(source);
    if (reason && !prev.reasons.includes(reason)) prev.reasons.push(reason);
  }
  return map;
}

function pruneBidirectional(edgeMap) {
  const removed = [];
  const keys = [...edgeMap.keys()];
  for (const k of keys) {
    if (!edgeMap.has(k)) continue;
    const e = edgeMap.get(k);
    const inverseKey = edgeKey(e.to, e.from);
    if (!edgeMap.has(inverseKey)) continue;
    const inv = edgeMap.get(inverseKey);
    if (e.confidence > inv.confidence) {
      edgeMap.delete(inverseKey);
      removed.push({ removed: inverseKey, kept: k, reason: 'lower_confidence_inverse' });
    } else if (e.confidence < inv.confidence) {
      edgeMap.delete(k);
      removed.push({ removed: k, kept: inverseKey, reason: 'lower_confidence_inverse' });
    } else {
      // Tie-break deterministic to avoid cycles on 2-node loops.
      if (k < inverseKey) {
        edgeMap.delete(inverseKey);
        removed.push({ removed: inverseKey, kept: k, reason: 'tie_break_lexicographic' });
      } else {
        edgeMap.delete(k);
        removed.push({ removed: k, kept: inverseKey, reason: 'tie_break_lexicographic' });
      }
    }
  }
  return removed;
}

function buildLayerLookup(layerConfig) {
  // Supported config shapes:
  // 1) { "planetary": { "basics": 0, "atmosphere": 1 } }
  // 2) { "planetary/basics": 0, "planetary/atmosphere": 1 }
  const lookup = new Map();
  if (!layerConfig || typeof layerConfig !== 'object') return lookup;
  for (const [k, v] of Object.entries(layerConfig)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const domain = normToken(k);
      for (const [sub, rank] of Object.entries(v)) {
        const n = Number(rank);
        if (!Number.isFinite(n)) continue;
        lookup.set(`${domain}/${normToken(sub)}`, n);
      }
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    lookup.set(normToken(k), n);
  }
  return lookup;
}

function makeSubdomainGroupKey(concept) {
  const domain = normToken(concept.domain || '');
  const subdomain = normToken(concept.subdomain || '');
  if (!domain || !subdomain) return null;
  return `${domain}/${subdomain}`;
}

function buildTrackAEdges(concepts, layerLookup) {
  const byDomainLayer = new Map(); // domain -> Map(layer -> conceptIds[])
  for (const c of concepts) {
    const domain = normToken(c.domain || '');
    const subdomain = normToken(c.subdomain || '');
    if (!domain || !subdomain) continue;
    const layer = layerLookup.get(`${domain}/${subdomain}`);
    if (!Number.isFinite(layer)) continue;
    if (!byDomainLayer.has(domain)) byDomainLayer.set(domain, new Map());
    const layerMap = byDomainLayer.get(domain);
    if (!layerMap.has(layer)) layerMap.set(layer, []);
    layerMap.get(layer).push(c.id);
  }

  const edges = [];
  for (const [domain, layerMap] of byDomainLayer.entries()) {
    const sortedLayers = [...layerMap.keys()].sort((a, b) => a - b);
    for (let i = 0; i < sortedLayers.length - 1; i += 1) {
      const fromLayer = sortedLayers[i];
      const toLayer = sortedLayers[i + 1];
      const fromIds = layerMap.get(fromLayer) || [];
      const toIds = layerMap.get(toLayer) || [];
      for (const from of fromIds) {
        for (const to of toIds) {
          if (from === to) continue;
          edges.push({
            from,
            to,
            confidence: LAYER_EDGE_CONFIDENCE,
            source: 'track_a_structural_layer',
            reason: `domain=${domain} layer_${fromLayer}->layer_${toLayer}`,
          });
        }
      }
    }
  }

  return edges;
}

function tokenizeText(s) {
  return normToken(s)
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildTrackCEdges(concepts) {
  const edges = [];
  const references = concepts.map((c) => {
    const names = uniq([c.title, ...(c.aliases || [])]).filter((x) => x.length >= 3);
    return { id: c.id, names };
  });

  for (const conceptA of concepts) {
    const haystack = normToken([conceptA.explanation, conceptA.short_description, conceptA.title].join(' '));
    if (!haystack) continue;
    for (const ref of references) {
      if (ref.id === conceptA.id) continue;
      let matchedName = null;
      for (const name of ref.names) {
        const n = normToken(name);
        if (!n) continue;
        // Phrase-level contains check; keep it simple and deterministic.
        if (haystack.includes(n)) {
          matchedName = name;
          break;
        }
      }
      if (!matchedName) continue;
      // If A references B in explanation, B is a potential prerequisite for A.
      edges.push({
        from: ref.id,
        to: conceptA.id,
        confidence: TEXT_REF_CONFIDENCE,
        source: 'track_c_text_reference',
        reason: `mentioned "${matchedName}" in explanation/description`,
      });
    }
  }

  return edges;
}

async function callLlmBatch({
  provider,
  model,
  concepts,
  subdomainKey,
  apiBaseUrl,
  apiKey,
  fastMode = false,
  maxTokens = 0,
}) {
  const controller = new AbortController();
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || process.env.LM_STUDIO_TIMEOUT_MS || 120000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const payload = {
    model,
    temperature: 0.1,
    ...(maxTokens > 0 ? { max_tokens: maxTokens } : {}),
    response_format:
      provider === 'lmstudio'
        ? {
            type: 'json_schema',
            json_schema: {
              name: 'concept_prereq_response',
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  prerequisites: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        from: { type: 'string' },
                        to: { type: 'string' },
                        confidence: { type: 'number' },
                        reason: { type: 'string' },
                      },
                      required: fastMode
                        ? ['from', 'to', 'confidence']
                        : ['from', 'to', 'confidence', 'reason'],
                    },
                  },
                  ...(fastMode
                    ? {}
                    : {
                        ranking: {
                          type: 'array',
                          items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                              id: { type: 'string' },
                              rank: { type: 'number' },
                              reason: { type: 'string' },
                            },
                            required: ['id', 'rank', 'reason'],
                          },
                        },
                      }),
                },
                required: fastMode ? ['prerequisites'] : ['ranking', 'prerequisites'],
              },
            },
          }
        : { type: 'text' },
    messages: [
      {
        role: 'system',
        content:
          fastMode
            ? 'You are an astronomy curriculum design expert. Return strict JSON only with key prerequisites. Never add markdown.'
            : 'You are an astronomy curriculum design expert. Return strict JSON only with exactly two keys: ranking and prerequisites. Never add markdown.',
      },
      {
        role: 'user',
        content: [
          `Subdomain: "${subdomainKey}"`,
          '',
          'Task:',
          ...(fastMode
            ? ['1) List ONLY hard prerequisites A -> B where A is truly required before B.']
            : [
                '1) Rank concepts from most foundational (rank=1) to most advanced.',
                '2) List ONLY hard prerequisites A -> B where A is truly required before B.',
              ]),
          '',
          'Output JSON shape:',
          ...(fastMode
            ? ['{ "prerequisites": [{ "from": "concept_id", "to": "concept_id", "confidence": 0.9 }] }']
            : [
                '{',
                '  "ranking": [{ "id": "concept_id", "rank": 1, "reason": "short reason" }],',
                '  "prerequisites": [{ "from": "concept_id", "to": "concept_id", "confidence": 0.9, "reason": "short reason" }]',
                '}',
              ]),
          '',
          'Concept list:',
          JSON.stringify(
            concepts.map((c) => ({
              id: c.id,
              title: c.title || '',
              description: c.short_description || '',
            })),
            null,
            fastMode ? 0 : 2,
          ),
        ].join('\n'),
      },
    ],
  };

  let res;
  try {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey || 'not-needed'}`,
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL || 'https://localhost';
      headers['X-Title'] = process.env.OPENROUTER_APP_NAME || 'galaxies-concept-prereq';
    }
    res = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`${provider} request failed (${res.status}): ${raw.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = extractFirstJsonObject(text);
  const normalized = normalizeLlmJsonShape(parsed);
  if (!normalized) {
    throw new Error(`Invalid LLM JSON for ${subdomainKey}`);
  }
  if (fastMode && !Array.isArray(normalized.prerequisites)) {
    throw new Error(`Invalid LLM JSON for ${subdomainKey}`);
  }
  return normalized;
}

async function buildTrackBEdges({
  concepts,
  models,
  maxBatchSize = 18,
  disableLlm = false,
  provider = 'lmstudio',
  apiBaseUrl = LM_STUDIO_BASE_URL,
  apiKey = LM_STUDIO_API_KEY,
  retryFailedBatchesMap = null,
  fastMode = false,
  maxTokens = 0,
}) {
  const bySubdomain = new Map();
  for (const c of concepts) {
    const k = makeSubdomainGroupKey(c);
    if (!k) continue;
    if (!bySubdomain.has(k)) bySubdomain.set(k, []);
    bySubdomain.get(k).push(c);
  }

  const edges = [];
  const rankings = {};
  const llmErrors = [];
  const calls = [];

  if (disableLlm) {
    return { edges, rankings, llmErrors, calls };
  }
  if (!models?.length) {
    llmErrors.push({ subdomain: '*', error: 'Missing --model/--model-list; Track B skipped.' });
    return { edges, rankings, llmErrors, calls };
  }
  const modelCooldownUntilMs = new Map();
  const maxCrashSplitDepth = Math.min(
    12,
    Math.max(1, Number(process.env.LLM_LMSTUDIO_CRASH_MAX_SPLIT_DEPTH || '8')) || 8,
  );

  for (const [subdomainKey, list] of bySubdomain.entries()) {
    const chunks = [];
    for (let i = 0; i < list.length; i += maxBatchSize) {
      chunks.push(list.slice(i, i + maxBatchSize));
    }

    const subdomainRanks = [];
    for (let idx = 0; idx < chunks.length; idx += 1) {
      const batch = chunks[idx];
      const batchNo = idx + 1;
      if (retryFailedBatchesMap) {
        const allowed = retryFailedBatchesMap.get(subdomainKey);
        if (!allowed || !allowed.has(batchNo)) {
          continue;
        }
      }
      console.log(`[Track B] ${subdomainKey} batch ${batchNo}/${chunks.length} size=${batch.length}`);

      const applyLlmJsonToBatch = (json, allowedIds) => {
        if (!fastMode) {
          const rankRows = Array.isArray(json.ranking) ? json.ranking : [];
          for (const row of rankRows) {
            const id = String(row?.id || '').trim();
            const rank = Number(row?.rank);
            if (!allowedIds.has(id) || !Number.isFinite(rank)) continue;
            subdomainRanks.push({ id, rank, reason: String(row?.reason || '').trim() });
          }
        }
        const prereqRows = Array.isArray(json.prerequisites) ? json.prerequisites : [];
        for (const row of prereqRows) {
          const from = String(row?.from || '').trim();
          const to = String(row?.to || '').trim();
          if (!allowedIds.has(from) || !allowedIds.has(to) || from === to) continue;
          let confidence = Number(row?.confidence);
          if (!Number.isFinite(confidence)) confidence = 0.85;
          confidence = Math.max(0, Math.min(1, confidence));
          edges.push({
            from,
            to,
            confidence,
            source: 'track_b_llm_hard_prereq',
            reason: String(row?.reason || '').trim() || `LLM hard prerequisite in ${subdomainKey}`,
          });
        }
      };

      async function processConceptSlice(slice, recoveryDepth) {
        const sliceIdSet = new Set(slice.map((c) => c.id));
        const labelSuffix = recoveryDepth > 0 ? ` split@${recoveryDepth} n=${slice.length}` : '';
        let lastErrMsg = '';

        for (const model of models) {
          const cooldownUntil = Number(modelCooldownUntilMs.get(model) || 0);
          if (Date.now() < cooldownUntil) {
            continue;
          }
          try {
            const json = await callLlmBatch({
              provider,
              model,
              concepts: slice,
              subdomainKey: `${subdomainKey}#${batchNo}${labelSuffix}`,
              apiBaseUrl,
              apiKey,
              fastMode,
              maxTokens,
            });
            calls.push({
              subdomain: subdomainKey,
              batch: batchNo,
              size: slice.length,
              model,
              ok: true,
              ...(recoveryDepth > 0 ? { lmStudioCrashSplitDepth: recoveryDepth } : {}),
            });
            applyLlmJsonToBatch(json, sliceIdSet);
            return { ok: true };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            lastErrMsg = msg;
            const httpCode = parseHttpCodeFromErrorMessage(msg);
            if (httpCode === 429) {
              modelCooldownUntilMs.set(model, Date.now() + 90_000);
            }
            calls.push({
              subdomain: subdomainKey,
              batch: batchNo,
              size: slice.length,
              model,
              ok: false,
              error: msg,
              ...(recoveryDepth > 0 ? { lmStudioCrashSplitDepth: recoveryDepth } : {}),
            });
          }
        }

        if (
          provider === 'lmstudio' &&
          slice.length > 1 &&
          recoveryDepth < maxCrashSplitDepth &&
          isLmStudioRecoverableBatchError(lastErrMsg)
        ) {
          const mid = Math.floor(slice.length / 2);
          const left = slice.slice(0, mid);
          const right = slice.slice(mid);
          if (left.length < 1 || right.length < 1) {
            return { ok: false, error: lastErrMsg || 'Split produced empty slice' };
          }
          console.log(
            `[Track B] ${subdomainKey} batch ${batchNo}: recoverable LM error; splitting ${slice.length} -> ${left.length}+${right.length} (depth ${recoveryDepth + 1})`,
          );
          const leftRes = await processConceptSlice(left, recoveryDepth + 1);
          if (!leftRes.ok) return leftRes;
          const rightRes = await processConceptSlice(right, recoveryDepth + 1);
          return rightRes;
        }

        return { ok: false, error: lastErrMsg || 'All candidate models failed for this batch' };
      }

      const batchResult = await processConceptSlice(batch, 0);
      if (!batchResult.ok) {
        llmErrors.push({
          subdomain: subdomainKey,
          batch: batchNo,
          error: batchResult.error || 'All candidate models failed for this batch',
        });
      }
    }

    if (subdomainRanks.length > 0) {
      // Normalize rank if multiple chunks in same subdomain (keep local order by rank then id).
      subdomainRanks.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
      rankings[subdomainKey] = subdomainRanks.map((r, i) => ({
        id: r.id,
        rank: i + 1,
        reason: r.reason,
      }));
    }
  }

  return { edges, rankings, llmErrors, calls };
}

function materializePrereqList(edgeMap, conceptIds, { minConfidence, maxPrereqsPerConcept }) {
  const incoming = new Map(); // to -> edge[]
  for (const e of edgeMap.values()) {
    if (e.confidence < minConfidence) continue;
    if (!incoming.has(e.to)) incoming.set(e.to, []);
    incoming.get(e.to).push(e);
  }

  const out = {};
  for (const id of conceptIds) {
    const rows = incoming.get(id) || [];
    rows.sort((a, b) => b.confidence - a.confidence || a.from.localeCompare(b.from));
    out[id] = rows.slice(0, maxPrereqsPerConcept).map((x) => x.from);
  }
  return out;
}

async function main() {
  const provider = normToken(getArgValue('--provider', process.env.LLM_PROVIDER || 'lmstudio'));
  const apply = hasFlag('--apply');
  const dryRun = !apply;
  const disableLlm = hasFlag('--no-llm');
  const model = getArgValue('--model', LM_STUDIO_MODEL);
  const modelListArg = getArgValue('--model-list', '');
  const apiBaseUrl = getArgValue(
    '--api-base-url',
    provider === 'openrouter' ? OPENROUTER_BASE_URL : LM_STUDIO_BASE_URL,
  );
  const apiKey = getArgValue('--api-key', provider === 'openrouter' ? OPENROUTER_API_KEY : LM_STUDIO_API_KEY);
  const maxBatchSize = Math.max(4, Number(getArgValue('--batch-size', '18')) || 18);
  const fastMode = hasFlag('--fast-mode') || normToken(process.env.LLM_FAST_MODE) === 'true';
  const maxTokens = Number(
    getArgValue('--max-tokens', process.env.LLM_MAX_TOKENS || (fastMode ? '320' : '1200')),
  );
  const minConfidence = Number(getArgValue('--min-confidence', String(DEFAULT_MIN_EDGE_CONFIDENCE)));
  const maxPrereqsPerConcept = Math.max(
    1,
    Number(getArgValue('--max-prereqs', String(DEFAULT_MAX_PREREQS_PER_CONCEPT))) || DEFAULT_MAX_PREREQS_PER_CONCEPT,
  );

  let models = [];
  if (modelListArg) {
    models = uniq(modelListArg.split(',').map((x) => x.trim()).filter(Boolean));
  } else if (model) {
    models = [model];
  }

  const useAllFreeModels =
    provider === 'openrouter' &&
    (hasFlag('--use-all-free-models') || normToken(process.env.OPENROUTER_USE_ALL_FREE_MODELS) === 'true');

  if (useAllFreeModels) {
    try {
      const res = await fetch(`${apiBaseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      const freeModels = uniq(
        (data?.data || [])
          .map((x) => String(x?.id || '').trim())
          .filter((id) => id.endsWith(':free')),
      );
      if (freeModels.length > 0) {
        models = freeModels;
      }
    } catch {
      // Keep provided models if listing free models fails.
    }
  }

  const outArg = getArgValue('--out', 'reports/concept-prereq-suggest.json');
  const retryFailedFromReportArg = getArgValue('--retry-failed-from-report', '');
  const retryFailedFromReportPath = retryFailedFromReportArg
    ? (path.isAbsolute(retryFailedFromReportArg)
      ? retryFailedFromReportArg
      : path.join(__dirname, '..', retryFailedFromReportArg))
    : '';
  let retryFailedBatchesMap = null;
  if (retryFailedFromReportPath) {
    const prev = loadJsonSafe(retryFailedFromReportPath);
    const errs = Array.isArray(prev?.llm?.errors) ? prev.llm.errors : [];
    retryFailedBatchesMap = new Map();
    for (const e of errs) {
      const sub = String(e?.subdomain || '').trim();
      const batch = Number(e?.batch);
      if (!sub || !Number.isFinite(batch)) continue;
      if (!retryFailedBatchesMap.has(sub)) retryFailedBatchesMap.set(sub, new Set());
      retryFailedBatchesMap.get(sub).add(batch);
    }
  }
  const outPath = path.isAbsolute(outArg) ? outArg : path.join(__dirname, '..', outArg);
  const layerArg = getArgValue('--layer-config', 'data/concept-subdomain-layers.json');
  const layerPath = path.isAbsolute(layerArg) ? layerArg : path.join(__dirname, '..', layerArg);
  const layerConfigRaw = loadJsonSafe(layerPath) || {};
  const layerLookup = buildLayerLookup(layerConfigRaw);

  await mongoose.connect(MONGO_URI);
  const conceptDocs = await Concept.find({}).lean();
  const concepts = conceptDocs
    .map((c) => ({
      _id: c._id,
      id: String(c.id || '').trim(),
      title: String(c.title || '').trim(),
      short_description: String(c.short_description || '').trim(),
      explanation: String(c.explanation || '').trim(),
      aliases: uniq(c.aliases),
      domain: String(c.domain || '').trim(),
      subdomain: String(c.subdomain || '').trim(),
      prerequisites: uniq(c.prerequisites),
    }))
    .filter((c) => !!c.id);

  const conceptIdSet = new Set(concepts.map((c) => c.id));
  const discoveredSubdomainKeys = uniq(
    concepts
      .map((c) => makeSubdomainGroupKey(c))
      .filter(Boolean),
  ).sort();
  const matchedSubdomainKeys = discoveredSubdomainKeys.filter((k) => layerLookup.has(k));
  const unmatchedSubdomainKeys = discoveredSubdomainKeys.filter((k) => !layerLookup.has(k));

  const trackAEdges = buildTrackAEdges(concepts, layerLookup);
  const trackCEdges = buildTrackCEdges(concepts);
  const trackB = await buildTrackBEdges({
    concepts,
    models,
    maxBatchSize,
    disableLlm,
    provider,
    apiBaseUrl,
    apiKey,
    retryFailedBatchesMap,
    fastMode,
    maxTokens,
  });

  const allEdges = [
    ...trackAEdges,
    ...trackB.edges,
    ...trackCEdges,
  ].filter((e) => conceptIdSet.has(e.from) && conceptIdSet.has(e.to) && e.from !== e.to);

  const mergedEdgeMap = toEdgeMap(allEdges);
  const prunedBidirectional = pruneBidirectional(mergedEdgeMap);

  const prereqMap = materializePrereqList(mergedEdgeMap, [...conceptIdSet], {
    minConfidence,
    maxPrereqsPerConcept,
  });

  let updated = 0;
  if (apply) {
    for (const c of concepts) {
      const nextPrereqs = uniq(prereqMap[c.id] || []).filter((x) => x !== c.id && conceptIdSet.has(x));
      const prevPrereqs = uniq(c.prerequisites);
      if (JSON.stringify(nextPrereqs) === JSON.stringify(prevPrereqs)) continue;
      await Concept.updateOne(
        { _id: c._id },
        { $set: { prerequisites: nextPrereqs } },
      );
      updated += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'apply',
    mongoUri: MONGO_URI,
    lmStudio: {
      provider,
      baseUrl: apiBaseUrl,
      model: model || null,
      candidateModels: models,
      enabled: !disableLlm,
    },
    config: {
      layerConfigPath: layerPath,
      retryFailedFromReportPath: retryFailedFromReportPath || null,
      layerConfigKeys: [...layerLookup.keys()].sort(),
      minConfidence,
      maxPrereqsPerConcept,
      maxBatchSize,
      fastMode,
      maxTokens,
    },
    taxonomyCoverage: {
      discoveredSubdomainKeys,
      matchedSubdomainKeys,
      unmatchedSubdomainKeys,
    },
    totals: {
      concepts: concepts.length,
      trackAEdges: trackAEdges.length,
      trackBEdges: trackB.edges.length,
      trackCEdges: trackCEdges.length,
      mergedEdges: mergedEdgeMap.size,
      prunedBidirectional: prunedBidirectional.length,
      conceptsUpdated: updated,
    },
    llm: {
      calls: trackB.calls,
      errors: trackB.llmErrors,
      rankingsBySubdomain: trackB.rankings,
    },
    sample: {
      edges: [...mergedEdgeMap.values()].slice(0, 80),
      prerequisitesByConcept: Object.fromEntries(
        Object.entries(prereqMap)
          .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
          .slice(0, 80),
      ),
    },
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, outPath, totals: report.totals, llmErrors: trackB.llmErrors.length }, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
