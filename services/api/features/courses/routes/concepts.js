const express = require('express');
const fs = require('fs');
const path = require('path');
const Concept = require('../models/Concept');
const TaxonomyRegistry = require('../models/TaxonomyRegistry');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

const DEFAULT_TAXONOMY = {
  astronomy: [
    'fundamentals',
    'orbital-mechanics',
    'stellar-physics',
    'galactic-cosmology',
    'observational-astronomy',
    'positional-astronomy',
  ],
  geology: ['tectonics', 'volcanology', 'stratigraphy', 'planetary-geology'],
  biology: ['evolution', 'ecology', 'paleontology'],
  physics: ['mechanics', 'thermodynamics', 'electromagnetism'],
  chemistry: ['astrochemistry', 'geochemistry', 'atmospheric-chemistry'],
};

function slugToken(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTaxonomyRegistry(input) {
  const src = input && typeof input === 'object' ? input : DEFAULT_TAXONOMY;
  const out = {};
  for (const [domainRaw, subRaw] of Object.entries(src)) {
    const domain = slugToken(domainRaw);
    if (!domain) continue;
    const arr = Array.isArray(subRaw) ? subRaw : [];
    const subdomains = [...new Set(arr.map((x) => slugToken(x)).filter(Boolean))];
    out[domain] = subdomains;
  }
  if (Object.keys(out).length === 0) return DEFAULT_TAXONOMY;
  return out;
}

function loadConceptSeed() {
  try {
    const p = path.join(__dirname, '../../../data/learningPathDefault.json');
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.concepts) ? data.concepts : [];
  } catch (e) {
    console.error('concept seed read error:', e);
    return [];
  }
}

function normalizeConcepts(concepts) {
  if (!Array.isArray(concepts)) return [];
  const base = concepts
    .map((c) => ({
      id: String(c.id || '').trim(),
      title: String(c.title || c.label || c.labelVi || '').trim(),
      short_description: String(c.short_description || '').trim(),
      explanation: String(c.explanation || c.definition || c.definitionVi || '').trim(),
      examples: Array.isArray(c.examples)
        ? [...new Set(c.examples.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      related: Array.isArray(c.related)
        ? [...new Set(c.related.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      domain: String(c.domain || '').trim(),
      subdomain: String(c.subdomain || '').trim(),
      aliases: Array.isArray(c.aliases)
        ? [...new Set(c.aliases.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      prerequisites: Array.isArray(c.prerequisites)
        ? [...new Set(c.prerequisites.map((x) => String(x || '').trim()).filter(Boolean))]
        : [],
      difficulty_level: Number.isFinite(Number(c.difficulty_level))
        ? Math.max(0, Math.min(2, Number(c.difficulty_level)))
        : 1,
      published: c.published !== false,
    }))
    .filter((c) => c.id);

  const idSet = new Set(base.map((c) => c.id));
  return base.map((c) => ({
    ...c,
    title: c.title || c.id,
    related: c.related.filter((rid) => rid !== c.id && idSet.has(rid)),
    prerequisites: c.prerequisites.filter((pid) => pid !== c.id && idSet.has(pid)),
  }));
}

async function ensureConceptSeed() {
  const total = await Concept.countDocuments();
  if (total > 0) return;
  const seed = normalizeConcepts(loadConceptSeed());
  if (!seed.length) return;
  await Concept.insertMany(seed, { ordered: false }).catch(() => {});
}

async function ensureTaxonomySeed() {
  const existing = await TaxonomyRegistry.findOne({ key: 'default' }).lean();
  if (existing && existing.taxonomy && Object.keys(existing.taxonomy).length > 0) return;
  await TaxonomyRegistry.updateOne(
    { key: 'default' },
    { $set: { taxonomy: DEFAULT_TAXONOMY } },
    { upsert: true },
  );
}

router.get('/', async (req, res) => {
  try {
    await ensureConceptSeed();
    const docs = await Concept.find({ published: true }).sort({ id: 1 }).lean();
    res.json({ success: true, data: { concepts: docs } });
  } catch (err) {
    console.error('GET concepts error:', err);
    res.status(500).json({ success: false, code: 'CONCEPTS_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    await ensureConceptSeed();
    const docs = await Concept.find({}).sort({ id: 1 }).lean();
    res.json({ success: true, data: { concepts: docs } });
  } catch (err) {
    console.error('GET concepts editor error:', err);
    res.status(500).json({ success: false, code: 'CONCEPTS_EDITOR_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.get('/taxonomy', async (req, res) => {
  try {
    await ensureTaxonomySeed();
    const doc = await TaxonomyRegistry.findOne({ key: 'default' }).lean();
    const taxonomy = normalizeTaxonomyRegistry(doc?.taxonomy);
    res.json({ success: true, data: { taxonomy } });
  } catch (err) {
    console.error('GET taxonomy error:', err);
    res.status(500).json({ success: false, code: 'TAXONOMY_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.get('/taxonomy/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    await ensureTaxonomySeed();
    const doc = await TaxonomyRegistry.findOne({ key: 'default' }).lean();
    const taxonomy = normalizeTaxonomyRegistry(doc?.taxonomy);
    res.json({ success: true, data: { taxonomy } });
  } catch (err) {
    console.error('GET taxonomy editor error:', err);
    res.status(500).json({ success: false, code: 'TAXONOMY_EDITOR_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const normalized = normalizeConcepts(req.body?.concepts);
    await Concept.deleteMany({});
    if (normalized.length) await Concept.insertMany(normalized, { ordered: false });
    const docs = await Concept.find({}).sort({ id: 1 }).lean();
    res.json({ success: true, data: { concepts: docs } });
  } catch (err) {
    console.error('PUT concepts editor error:', err);
    res.status(500).json({ success: false, code: 'CONCEPTS_EDITOR_SAVE_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.put('/taxonomy/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const taxonomy = normalizeTaxonomyRegistry(req.body?.taxonomy);
    await TaxonomyRegistry.updateOne(
      { key: 'default' },
      { $set: { taxonomy } },
      { upsert: true },
    );
    res.json({ success: true, data: { taxonomy } });
  } catch (err) {
    console.error('PUT taxonomy editor error:', err);
    res.status(500).json({ success: false, code: 'TAXONOMY_EDITOR_SAVE_FAILED', error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
