const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const {
  recordLearningEvent,
  getLearnerSnapshot,
  getLessonState,
  getConceptState,
  getWeakLessons,
  getSpacedReviewDue,
} = require('../services/learningStateEngine');

const router = express.Router();

router.get('/snapshot', authMiddleware, async (req, res, next) => {
  try {
    const snapshot = await getLearnerSnapshot(req.userId);
    res.json({ success: true, snapshot });
  } catch (err) {
    next(err);
  }
});

router.get('/lesson/:lessonId', authMiddleware, async (req, res, next) => {
  try {
    const state = await getLessonState(req.userId, req.params.lessonId);
    res.json({ success: true, state });
  } catch (err) {
    next(err);
  }
});

router.get('/concept/:conceptId', authMiddleware, async (req, res, next) => {
  try {
    const state = await getConceptState(req.userId, req.params.conceptId);
    res.json({ success: true, state });
  } catch (err) {
    next(err);
  }
});

/** Batch concept states for Explore panel chips (max 12 ids). */
router.get('/concepts', authMiddleware, async (req, res, next) => {
  try {
    const raw = typeof req.query.ids === 'string' ? req.query.ids : '';
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (!ids.length) {
      return res.json({ success: true, concepts: [] });
    }
    const ConceptLearningState = require('../models/ConceptLearningState');
    const rows = await ConceptLearningState.find({
      userId: req.userId,
      conceptId: { $in: ids },
    }).lean();
    const concepts = rows.map((row) => ({
      conceptId: row.conceptId,
      mastery: row.mastery ?? 0,
      confidence: row.confidence ?? 0.5,
      nextBestAction: row.nextBestAction || 'none',
      attemptCount: row.attemptCount ?? 0,
      lastPassedAt: row.lastPassedAt || null,
      misconceptionCount: Array.isArray(row.misconceptions) ? row.misconceptions.length : 0,
    }));
    res.json({ success: true, concepts });
  } catch (err) {
    next(err);
  }
});

router.get('/weak-lessons', authMiddleware, async (req, res, next) => {
  try {
    const lessonId =
      typeof req.query.lessonId === 'string' ? req.query.lessonId.trim() : undefined;
    const weakLessons = await getWeakLessons(req.userId, { lessonId });
    res.json({ success: true, weakLessons });
  } catch (err) {
    next(err);
  }
});

router.get('/spaced-review', authMiddleware, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const data = await getSpacedReviewDue(req.userId, { limit });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.post('/events', authMiddleware, async (req, res, next) => {
  try {
    const body = req.body || {};
    const events = Array.isArray(body.events) ? body.events : [body];
    const results = [];
    for (const ev of events) {
      const r = await recordLearningEvent(req.userId, ev);
      results.push(r);
    }
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
