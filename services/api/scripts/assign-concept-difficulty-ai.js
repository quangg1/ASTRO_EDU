/**
 * Assign pedagogical difficulty_level (0/1/2) for concepts in batches.
 *
 * Usage:
 *   node scripts/assign-concept-difficulty-ai.js --dry-run
 *   node scripts/assign-concept-difficulty-ai.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const fetch = require('node-fetch')
const Concept = require('../features/courses/models/Concept')

const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies'
const apply = process.argv.includes('--apply')
const dryRun = !apply
const batchArgIdx = process.argv.indexOf('--batch-size')
const batchArg = batchArgIdx >= 0 ? Number(process.argv[batchArgIdx + 1]) : NaN
const batchSize = Number.isFinite(batchArg) && batchArg > 0 ? batchArg : Number(process.env.CONCEPT_DIFFICULTY_BATCH_SIZE || 24)
const concurrencyArgIdx = process.argv.indexOf('--concurrency')
const concurrencyArg = concurrencyArgIdx >= 0 ? Number(process.argv[concurrencyArgIdx + 1]) : NaN
const concurrency =
  Number.isFinite(concurrencyArg) && concurrencyArg > 0 ? Math.max(1, Math.floor(concurrencyArg)) : Number(process.env.CONCEPT_DIFFICULTY_CONCURRENCY || 1)
const minBatchArgIdx = process.argv.indexOf('--min-batch-size')
const minBatchArg = minBatchArgIdx >= 0 ? Number(process.argv[minBatchArgIdx + 1]) : NaN
const minBatchSize =
  Number.isFinite(minBatchArg) && minBatchArg > 0 ? Math.max(1, Math.floor(minBatchArg)) : Number(process.env.CONCEPT_DIFFICULTY_MIN_BATCH_SIZE || 6)
const providerArgIdx = process.argv.indexOf('--provider')
const provider = providerArgIdx >= 0 ? String(process.argv[providerArgIdx + 1] || '').trim().toLowerCase() : 'lmstudio'
const modelArgIdx = process.argv.indexOf('--model')
const modelArg = modelArgIdx >= 0 ? String(process.argv[modelArgIdx + 1] || '').trim() : ''
const baseUrlArgIdx = process.argv.indexOf('--base-url')
const baseUrlArg = baseUrlArgIdx >= 0 ? String(process.argv[baseUrlArgIdx + 1] || '').trim() : ''

const LM_STUDIO_BASE_URL = baseUrlArg || process.env.LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1'
const LM_STUDIO_MODEL = modelArg || process.env.LM_STUDIO_MODEL || process.env.LLM_MODEL || ''
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY || 'lm-studio'

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

function pickDifficultyWithFallback(current, proposed) {
  const p = Number(proposed)
  if (Number.isFinite(p) && p >= 0 && p <= 2) return p
  const c = Number(current)
  if (Number.isFinite(c) && c >= 0 && c <= 2) return c
  return 1
}

function inferHeuristicDifficulty(concept) {
  const text = [
    concept.id,
    concept.title,
    concept.short_description,
    concept.explanation,
    ...(concept.aliases || []),
  ]
    .join(' ')
    .toLowerCase()
  if (/(equation|tensor|relativistic|flrw|n-?body|interferometry|lambda|lcdm|singularity)/.test(text)) return 2
  if (/(doppler|spectrum|orbital|kepler|accretion|hydrostatic|redshift|blueshift|hubble)/.test(text)) return 1
  return 0
}

function tryParseJsonObjectOrArray(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()
  const attempts = [candidate]
  const objStart = candidate.indexOf('{')
  const objEnd = candidate.lastIndexOf('}')
  if (objStart >= 0 && objEnd > objStart) attempts.push(candidate.slice(objStart, objEnd + 1))
  const arrStart = candidate.indexOf('[')
  const arrEnd = candidate.lastIndexOf(']')
  if (arrStart >= 0 && arrEnd > arrStart) attempts.push(candidate.slice(arrStart, arrEnd + 1))
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch {
      // next attempt
    }
  }
  return null
}

function normalizeRowsFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.rows)) return payload.rows
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  if (payload.result && Array.isArray(payload.result.rows)) return payload.result.rows
  return []
}

function isContextExceededError(err) {
  const msg = String(err?.message || '').toLowerCase()
  return msg.includes('context size has been exceeded') || msg.includes('maximum context length') || msg.includes('token')
}

async function callChatCompletions({ baseUrl, apiKey, model, systemPrompt, userPrompt }) {
  if (!model) throw new Error('missing_model')
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 900,
      response_format: provider === 'lmstudio' ? { type: 'text' } : { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`chat_completion_failed_${res.status}: ${text.slice(0, 240)}`)
  }
  const data = await res.json()
  const content = String(data?.choices?.[0]?.message?.content || '').trim()
  if (!content) return { parsed: null, rawContent: '' }
  return { parsed: tryParseJsonObjectOrArray(content), rawContent: content }
}

async function classifyBatch(batch) {
  const systemPrompt =
    'You are a curriculum taxonomy assistant. Return strict JSON object only: {"rows":[{"id":"...","difficulty_level":0|1|2}]}. No extra text.'
  const userPrompt = JSON.stringify({
    task: 'Assign pedagogical difficulty based on learning stage, not prerequisite depth. Output only id and difficulty_level.',
    rubric: {
      0: 'Beginner: direct intuition, first-contact concept, low abstraction.',
      1: 'Explorer: mechanism/model understanding, moderate abstraction.',
      2: 'Researcher: advanced model/formalism/high abstraction.',
    },
    rows: batch.map((c) => ({
      id: c.id,
      title: c.title,
      short_description: c.short_description,
      domain: c.domain || '',
      subdomain: c.subdomain || '',
    })),
  })

  let payload = null
  let rawContent = ''
  if (provider === 'lmstudio') {
    const result = await callChatCompletions({
      baseUrl: LM_STUDIO_BASE_URL,
      apiKey: LM_STUDIO_API_KEY,
      model: LM_STUDIO_MODEL,
      systemPrompt,
      userPrompt,
    })
    payload = result?.parsed ?? null
    rawContent = result?.rawContent ?? ''
  } else if (provider === 'groq') {
    const result = await callChatCompletions({
      baseUrl: GROQ_BASE_URL,
      apiKey: GROQ_API_KEY,
      model: GROQ_MODEL,
      systemPrompt,
      userPrompt,
    })
    payload = result?.parsed ?? null
    rawContent = result?.rawContent ?? ''
  } else {
    throw new Error(`unsupported_provider_${provider}`)
  }

  const rows = normalizeRowsFromPayload(payload)
  const map = new Map()
  for (const row of rows) {
    if (!row?.id) continue
    map.set(String(row.id), {
      difficulty_level: pickDifficultyWithFallback(1, row.difficulty_level),
      reason: String(row.reason || '').slice(0, 120),
    })
  }
  return { map, rowsCount: rows.length, rawContent }
}

async function classifyBatchWithBackoff(batch, batchNo) {
  try {
    const out = await classifyBatch(batch)
    if (out.map.size === 0) {
      const preview = String(out.rawContent || '').replace(/\s+/g, ' ').slice(0, 220)
      throw new Error(`empty_prediction_batch raw="${preview}"`)
    }
    return out.map
  } catch (err) {
    if (isContextExceededError(err) && batch.length > minBatchSize) {
      const mid = Math.ceil(batch.length / 2)
      console.warn(`Batch ${batchNo}: context exceeded, splitting ${batch.length} -> ${mid}+${batch.length - mid}`)
      const left = await classifyBatchWithBackoff(batch.slice(0, mid), `${batchNo}.1`)
      const right = await classifyBatchWithBackoff(batch.slice(mid), `${batchNo}.2`)
      const merged = new Map(left)
      for (const [k, v] of right.entries()) merged.set(k, v)
      return merged
    }
    throw err
  }
}

async function main() {
  await mongoose.connect(uri)
  const docs = await Concept.find({}).lean()
  if (!docs.length) {
    console.log('No concepts found.')
    await mongoose.disconnect()
    return
  }

  let changed = 0
  let llmFailures = 0
  let heuristicFallbackCount = 0
  const sample = []
  const batches = []
  for (let i = 0; i < docs.length; i += batchSize) batches.push(docs.slice(i, i + batchSize))

  for (let i = 0; i < batches.length; i += concurrency) {
    const slice = batches.slice(i, i + concurrency)
    const results = await Promise.all(
      slice.map(async (batch, offset) => {
        const batchNo = i + offset + 1
        let predicted = new Map()
        try {
          predicted = await classifyBatchWithBackoff(batch, String(batchNo))
        } catch (err) {
          llmFailures += 1
          for (const c of batch) {
            predicted.set(c.id, {
              difficulty_level: inferHeuristicDifficulty(c),
              reason: 'heuristic_fallback',
            })
          }
          heuristicFallbackCount += batch.length
          console.warn(`Batch ${batchNo}: fallback heuristic due to LLM failure: ${err.message}`)
        }
        return { batchNo, batch, predicted }
      }),
    )

    for (const { batch, predicted } of results) {
      for (const c of batch) {
        const cur = pickDifficultyWithFallback(c.difficulty_level, c.difficulty_level)
        const next = pickDifficultyWithFallback(cur, predicted.get(c.id)?.difficulty_level)
        if (cur === next) continue
        changed += 1
        if (sample.length < 12) {
          sample.push({ id: c.id, from: cur, to: next, reason: predicted.get(c.id)?.reason || '' })
        }
        if (apply) {
          await Concept.updateOne({ _id: c._id }, { $set: { difficulty_level: next } })
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'apply',
        provider,
        model: provider === 'lmstudio' ? LM_STUDIO_MODEL : GROQ_MODEL,
        batchSize,
        minBatchSize,
        concurrency,
        total: docs.length,
        changed,
        llmFailures,
        heuristicFallbackCount,
        sample,
      },
      null,
      2,
    ),
  )

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

