const express = require('express');
const { authMiddleware, requireRole } = require('../../../../shared/jwtAuth');
const {
  getBySlug,
  getBySlugForEditor,
  upsertBySlug,
  setPublishedBySlug,
} = require('../services/narrativeSpace.service');

const router = express.Router();

router.get('/:slug', async (req, res) => {
  try {
    const doc = await getBySlug(req.params.slug);
    if (!doc) return res.status(404).json({ success: false, error: 'Narrative space not found' });
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('Get narrative space failed:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/:slug/beats', async (req, res) => {
  try {
    const doc = await getBySlug(req.params.slug);
    if (!doc) return res.status(404).json({ success: false, error: 'Narrative space not found' });
    return res.json({ success: true, data: doc.beats || [] });
  } catch (err) {
    console.error('Get narrative beats failed:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/:slug/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const doc = await getBySlugForEditor(req.params.slug);
    if (!doc) return res.json({ success: true, data: null });
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('Get narrative space editor failed:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/:slug', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const saved = await upsertBySlug(req.params.slug, req.body || {});
    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error('Upsert narrative space failed:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/:slug/publish', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const published = req.body?.published !== false;
    const saved = await setPublishedBySlug(req.params.slug, published);
    if (!saved) return res.status(404).json({ success: false, error: 'Narrative space not found' });
    return res.json({ success: true, data: saved });
  } catch (err) {
    console.error('Publish narrative space failed:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
