const express = require('express');
const PlanetNarrative = require('../models/PlanetNarrative');
const { authMiddleware, requireRole } = require('../../../../shared/jwtAuth');

const router = express.Router();

function normalizeEntityId(id) {
  const s = String(id || '').trim();
  if (!s || s.length > 80) return '';
  return s;
}

function normalizeKind(entityId, raw) {
  const k = String(raw || '').trim();
  if (k === 'mars' || k === 'earth' || k === 'generic') return k === 'mars' ? 'generic' : k;
  if (entityId === 'planet-earth') return 'earth';
  if (entityId.startsWith('planet-')) return 'generic';
  return 'generic';
}

function normalizeDoc(doc) {
  if (!doc) return null;
  const entityId = normalizeEntityId(doc.entityId);
  if (!entityId) return null;
  const beats = Array.isArray(doc.beats) && doc.beats.length > 0
    ? doc.beats
    : Array.isArray(doc.stages)
      ? doc.stages
      : [];
  const linkedLessonIds = Array.isArray(doc.linkedLessonIds)
    ? [...new Set(doc.linkedLessonIds.map((x) => String(x || '').trim()).filter(Boolean))]
    : [];
  const linkedConceptIds = Array.isArray(doc.linkedConceptIds)
    ? [...new Set(doc.linkedConceptIds.map((x) => String(x || '').trim()).filter(Boolean))]
    : [];
  return {
    entityId,
    kind: normalizeKind(entityId, doc.kind),
    beats,
    stages: beats,
    sites: Array.isArray(doc.sites) ? doc.sites : [],
    stageVisuals:
      doc.stageVisuals && typeof doc.stageVisuals === 'object' && !Array.isArray(doc.stageVisuals)
        ? doc.stageVisuals
        : {},
    panelSchema: doc.panelSchema ?? undefined,
    published: doc.published !== false,
    linkedLessonIds,
    linkedConceptIds,
    updatedAt: doc.updatedAt,
  };
}

router.get('/editor/:entityId', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const entityId = normalizeEntityId(req.params.entityId);
    if (!entityId) return res.status(400).json({ success: false, error: 'entityId không hợp lệ' });
    const doc = await PlanetNarrative.findOne({ entityId }).lean();
    res.json({
      success: true,
      data: doc ? normalizeDoc(doc) : null,
      source: doc ? 'db' : 'preset',
    });
  } catch (err) {
    console.error('GET planet-narratives/editor/:entityId', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const entityId = normalizeEntityId(req.body?.entityId);
    if (!entityId) return res.status(400).json({ success: false, error: 'entityId bắt buộc' });
    const beats = Array.isArray(req.body?.beats)
      ? req.body.beats
      : Array.isArray(req.body?.stages)
        ? req.body.stages
        : [];
    const sites = Array.isArray(req.body?.sites) ? req.body.sites : [];
    const stageVisuals =
      req.body?.stageVisuals && typeof req.body.stageVisuals === 'object' && !Array.isArray(req.body.stageVisuals)
        ? req.body.stageVisuals
        : {};
    const kind = normalizeKind(entityId, req.body?.kind);
    const published = req.body?.published !== false;
    const panelSchema =
      req.body?.panelSchema && typeof req.body.panelSchema === 'object' && !Array.isArray(req.body.panelSchema)
        ? req.body.panelSchema
        : undefined;
    const linkedLessonIds = Array.isArray(req.body?.linkedLessonIds)
      ? [...new Set(req.body.linkedLessonIds.map((x) => String(x || '').trim()).filter(Boolean))]
      : [];
    const linkedConceptIds = Array.isArray(req.body?.linkedConceptIds)
      ? [...new Set(req.body.linkedConceptIds.map((x) => String(x || '').trim()).filter(Boolean))]
      : [];

    const doc = await PlanetNarrative.findOneAndUpdate(
      { entityId },
      {
        $set: {
          entityId,
          kind,
          beats,
          stages: beats,
          sites,
          stageVisuals,
          published,
          linkedLessonIds,
          linkedConceptIds,
          ...(panelSchema ? { panelSchema } : {}),
        },
      },
      { upsert: true, new: true },
    ).lean();

    res.json({ success: true, data: normalizeDoc(doc), source: 'db' });
  } catch (err) {
    console.error('PUT planet-narratives/editor', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/:entityId', async (req, res) => {
  try {
    const entityId = normalizeEntityId(req.params.entityId);
    if (!entityId) return res.status(400).json({ success: false, error: 'entityId không hợp lệ' });
    const doc = await PlanetNarrative.findOne({ entityId, published: { $ne: false } }).lean();
    if (!doc) {
      return res.json({ success: true, data: null, source: 'preset' });
    }
    res.json({ success: true, data: normalizeDoc(doc), source: 'db' });
  } catch (err) {
    console.error('GET planet-narratives/:entityId', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
