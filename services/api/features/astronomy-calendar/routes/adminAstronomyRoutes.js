const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { AppError } = require('../../../shared/errors');
const AstronomyEvent = require('../models/AstronomyEvent');
const {
  eventToAdminDto,
  importSuggestionsFromCompute,
} = require('../services/astronomyEventService');
const { listTypeKits, updateTypeKit } = require('../services/typeKitService');
const { recordAdminAction } = require('../../admin/lib/recordAdminAction');

const router = express.Router();

router.use(authMiddleware, requireAdminScope('system'));

router.get('/type-kits', async (_req, res) => {
  try {
    const kits = await listTypeKits();
    res.json({ success: true, data: Object.values(kits) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.patch('/type-kits/:type', async (req, res) => {
  try {
    const data = await updateTypeKit(req.params.type, req.body, req.userId);
    await recordAdminAction({
      actorUserId: req.userId,
      action: 'astronomy_type_kit_update',
      targetType: 'astronomy_type_kit',
      targetId: req.params.type,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'Cập nhật thất bại' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const rows = await AstronomyEvent.find().sort({ startAt: 1 }).limit(500).lean();
    res.json({ success: true, data: rows.map(eventToAdminDto) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/import-suggestions', async (req, res) => {
  try {
    const days = Math.min(365, Math.max(30, Number(req.body?.days) || 90));
    const publish = req.body?.publish === true;
    const result = await importSuggestionsFromCompute({
      days,
      actorUserId: req.userId,
      publish,
    });
    await recordAdminAction({
      actorUserId: req.userId,
      action: 'astronomy_import_suggestions',
      targetType: 'astronomy_event',
      reason: `Import ${result.total} sự kiện (${publish ? 'publish' : 'draft'})`,
      payload: result,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi import' });
  }
});

router.post('/', async (req, res) => {
  try {
    const eventId = String(req.body?.eventId || req.body?.id || '').trim();
    if (!eventId) throw new AppError(400, 'INVALID_ID', 'Thiếu eventId');
    const startAt = new Date(req.body?.startAt);
    const endAt = new Date(req.body?.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new AppError(400, 'INVALID_DATE', 'Ngày không hợp lệ');
    }

    const doc = await AstronomyEvent.create({
      eventId,
      status: req.body?.status === 'published' ? 'published' : 'draft',
      eventKind: req.body?.eventKind === 'educational' ? 'educational' : 'observable',
      type: req.body?.type || 'moon_phase',
      source: 'editorial',
      titleVi: String(req.body?.titleVi || eventId).trim(),
      summaryVi: String(req.body?.summaryVi || '').trim(),
      subtitleVi: String(req.body?.subtitleVi || '').trim(),
      subtitleEn: String(req.body?.subtitleEn || '').trim(),
      descriptionVi: String(req.body?.descriptionVi || '').trim(),
      observationTipsVi: String(req.body?.observationTipsVi || '').trim(),
      visibilityLabelVi: String(req.body?.visibilityLabelVi || '').trim(),
      typeLabelVi: String(req.body?.typeLabelVi || '').trim(),
      startAt,
      endAt,
      peakAt: req.body?.peakAt ? new Date(req.body.peakAt) : null,
      exploreView: req.body?.exploreView || null,
      exploreTarget: req.body?.exploreTarget || null,
      lessonHref: req.body?.lessonHref || null,
      quizHref: req.body?.quizHref || null,
      difficulty: req.body?.difficulty || null,
      moonPhaseHint: req.body?.moonPhaseHint || null,
      priority: Number(req.body?.priority) || 0,
      featured: req.body?.featured === true,
      authoredBy: String(req.userId),
      publishedBy: req.body?.status === 'published' ? String(req.userId) : null,
      publishedAt: req.body?.status === 'published' ? new Date() : null,
    });
    res.status(201).json({ success: true, data: eventToAdminDto(doc) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, error: 'eventId đã tồn tại' });
    }
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const doc = await AstronomyEvent.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy' });

    const fields = [
      'titleVi',
      'summaryVi',
      'subtitleVi',
      'subtitleEn',
      'descriptionVi',
      'observationTipsVi',
      'visibilityLabelVi',
      'typeLabelVi',
      'type',
      'eventKind',
      'exploreView',
      'exploreTarget',
      'lessonHref',
      'quizHref',
      'difficulty',
      'moonPhaseHint',
      'reviewNote',
    ];
    for (const f of fields) {
      if (req.body?.[f] !== undefined) doc[f] = req.body[f];
    }
    if (req.body?.startAt) doc.startAt = new Date(req.body.startAt);
    if (req.body?.endAt) doc.endAt = new Date(req.body.endAt);
    if (req.body?.peakAt !== undefined) doc.peakAt = req.body.peakAt ? new Date(req.body.peakAt) : null;
    if (req.body?.priority != null) doc.priority = Number(req.body.priority) || 0;
    if (req.body?.featured != null) doc.featured = Boolean(req.body.featured);
    if (req.body?.urgencyRank != null) doc.urgencyRank = Number(req.body.urgencyRank) || 0;
    if (req.body?.gemRewardOverride != null) {
      doc.gemRewardOverride = req.body.gemRewardOverride === null ? null : Number(req.body.gemRewardOverride);
    }

    if (req.body?.status) {
      const next = String(req.body.status);
      if (['draft', 'review', 'published', 'archived'].includes(next)) {
        doc.status = next;
        if (next === 'published') {
          doc.publishedBy = String(req.userId);
          doc.publishedAt = new Date();
        }
      }
    }

    await doc.save();
    res.json({ success: true, data: eventToAdminDto(doc) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const doc = await AstronomyEvent.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    doc.status = 'published';
    doc.publishedBy = String(req.userId);
    doc.publishedAt = new Date();
    await doc.save();
    await recordAdminAction({
      actorUserId: req.userId,
      action: 'astronomy_event_publish',
      targetType: 'astronomy_event',
      targetId: doc.eventId,
    });
    res.json({ success: true, data: eventToAdminDto(doc) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await AstronomyEvent.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

module.exports = router;
