/**
 * Enrich Concept library fields with safe deterministic rules.
 *
 * Usage:
 *   node scripts/enrich-concepts.js --dry-run
 *   node scripts/enrich-concepts.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const Concept = require('../features/courses/models/Concept')
const TaxonomyRegistry = require('../features/courses/models/TaxonomyRegistry')

const uri = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies'
const apply = process.argv.includes('--apply')
const dryRun = !apply

function uniq(arr) {
  return [...new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean))]
}

function titleFromId(id) {
  return String(id || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function slugToken(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DOMAIN_HINTS = [
  {
    domain: 'astronomy',
    subdomain: 'fundamentals',
    tokens: ['astronomy', 'planet', 'star', 'galaxy', 'nebula', 'comet', 'meteor', 'moon', 'solar'],
  },
  {
    domain: 'astronomy',
    subdomain: 'orbital-mechanics',
    tokens: ['orbit', 'rotation', 'revolution', 'eclipse', 'kepler', 'gravity', 'trajectory'],
  },
  {
    domain: 'physics',
    subdomain: 'mechanics',
    tokens: ['velocity', 'acceleration', 'force', 'momentum', 'energy', 'mass'],
  },
  {
    domain: 'physics',
    subdomain: 'electromagnetism',
    tokens: ['light', 'spectrum', 'wavelength', 'frequency', 'doppler', 'radiation'],
  },
  {
    domain: 'chemistry',
    subdomain: 'atmospheric-chemistry',
    tokens: ['co2', 'carbon', 'oxygen', 'sulfur', 'acid', 'atmosphere', 'molecule', 'chemical'],
  },
  {
    domain: 'geology',
    subdomain: 'planetary-geology',
    tokens: ['rock', 'stone', 'crater', 'volcano', 'tectonic', 'basalt', 'mineral', 'regolith'],
  },
]

function inferDomainSubdomain(concept) {
  const text = [
    concept.id,
    concept.title,
    concept.short_description,
    concept.explanation,
    ...(concept.aliases || []),
  ]
    .join(' ')
    .toLowerCase()
  for (const hint of DOMAIN_HINTS) {
    if (hint.tokens.some((t) => text.includes(t))) {
      return { domain: hint.domain, subdomain: hint.subdomain }
    }
  }
  return { domain: 'astronomy', subdomain: 'fundamentals' }
}

function buildDescription(title, domain) {
  return `${title} la mot khai niem thuoc ${domain} trong lo trinh hoc.`
}

function buildExplanation(title, shortDescription) {
  return `${shortDescription} Phan noi dung nay giup nguoi hoc nam duoc ban chat, boi canh va cach ap dung cua "${title}" trong cac bai hoc lien quan.`
}

async function main() {
  await mongoose.connect(uri)

  const docs = await Concept.find({}).lean()
  if (!docs.length) {
    console.log('No concepts found.')
    await mongoose.disconnect()
    return
  }

  const allIds = new Set(docs.map((d) => String(d.id || '').trim()).filter(Boolean))
  let updatedCount = 0
  let unchangedCount = 0
  const samples = []
  const domainSubdomainSet = new Map()

  for (const doc of docs) {
    const next = { ...doc }
    const id = String(next.id || '').trim()
    if (!id) continue

    next.title = String(next.title || '').trim() || titleFromId(id)
    const inferred = inferDomainSubdomain(next)
    next.domain = String(next.domain || '').trim() || inferred.domain
    next.subdomain = String(next.subdomain || '').trim() || inferred.subdomain

    next.short_description =
      String(next.short_description || '').trim() || buildDescription(next.title, next.domain)
    next.explanation =
      String(next.explanation || '').trim() || buildExplanation(next.title, next.short_description)

    const aliasCandidates = [
      ...(next.aliases || []),
      id,
      id.replace(/_/g, '-'),
      id.replace(/-/g, '_'),
      next.title.toLowerCase(),
    ]
    next.aliases = uniq(aliasCandidates)
    next.examples = uniq(next.examples)
    next.related = uniq(next.related).filter((rid) => rid !== id && allIds.has(rid))
    next.prerequisites = uniq(next.prerequisites).filter((pid) => pid !== id && allIds.has(pid))
    if (typeof next.published !== 'boolean') next.published = true

    const changed =
      next.title !== (doc.title || '') ||
      next.short_description !== (doc.short_description || '') ||
      next.explanation !== (doc.explanation || '') ||
      next.domain !== (doc.domain || '') ||
      next.subdomain !== (doc.subdomain || '') ||
      JSON.stringify(next.aliases || []) !== JSON.stringify(doc.aliases || []) ||
      JSON.stringify(next.related || []) !== JSON.stringify(doc.related || []) ||
      JSON.stringify(next.prerequisites || []) !== JSON.stringify(doc.prerequisites || []) ||
      next.published !== doc.published

    if (changed) {
      updatedCount += 1
      if (samples.length < 10) {
        samples.push({
          id,
          domain: next.domain,
          subdomain: next.subdomain,
          title: next.title,
        })
      }
      if (apply) {
        await Concept.updateOne(
          { _id: doc._id },
          {
            $set: {
              title: next.title,
              short_description: next.short_description,
              explanation: next.explanation,
              examples: next.examples,
              related: next.related,
              domain: next.domain,
              subdomain: next.subdomain,
              aliases: next.aliases,
              prerequisites: next.prerequisites,
              published: next.published,
            },
          },
        )
      }
    } else {
      unchangedCount += 1
    }

    if (!domainSubdomainSet.has(next.domain)) domainSubdomainSet.set(next.domain, new Set())
    domainSubdomainSet.get(next.domain).add(next.subdomain)
  }

  if (apply) {
    const taxonomy = {}
    for (const [domain, subs] of domainSubdomainSet.entries()) {
      taxonomy[slugToken(domain)] = [...subs].map(slugToken).filter(Boolean).sort()
    }
    await TaxonomyRegistry.updateOne(
      { key: 'default' },
      { $set: { taxonomy } },
      { upsert: true },
    )
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    uri,
    total: docs.length,
    updatedCount,
    unchangedCount,
    sampleUpdates: samples,
  }, null, 2))

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

