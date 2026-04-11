const express = require('express');
const fs = require('fs');
const path = require('path');
const Concept = require('../models/Concept');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

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
      published: c.published !== false,
    }))
    .filter((c) => c.id);

  const idSet = new Set(base.map((c) => c.id));
  return base.map((c) => ({
    ...c,
    title: c.title || c.id,
    related: c.related.filter((rid) => rid !== c.id && idSet.has(rid)),
  }));
}

async function ensureConceptSeed() {
  const total = await Concept.countDocuments();
  if (total > 0) return;
  const seed = normalizeConcepts(loadConceptSeed());
  if (!seed.length) return;
  await Concept.insertMany(seed, { ordered: false }).catch(() => {});
}

router.get('/', async (req, res) => {
  try {
    await ensureConceptSeed();
    const docs = await Concept.find({ published: true }).sort({ id: 1 }).lean();
    res.json({ success: true, data: { concepts: docs } });
  } catch (err) {
    console.error('GET concepts error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    await ensureConceptSeed();
    const docs = await Concept.find({}).sort({ id: 1 }).lean();
    res.json({ success: true, data: { concepts: docs } });
  } catch (err) {
    console.error('GET concepts editor error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
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
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
