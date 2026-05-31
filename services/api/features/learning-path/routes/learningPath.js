const express = require('express');
const LearningPath = require('../models/LearningPath');
const UserProgress = require('../models/UserProgress');
const Concept = require('../../concepts/models/Concept');
const { authMiddleware, optionalAuth, requireRole } = require('../../../shared/jwtAuth');
const { generateRecallQuizFromLesson } = require('../../../lib/ai/tasks/generateRecallQuiz');
const { emitAsync } = require('../../../services/eventBus');
const { coerceLessonSections } = require('../../../shared/schemas/lessonSectionSchema');
const { normalizeQuizList } = require('../../../shared/quizQuestion');
const { applyLearningPathLearnerPolicy } = require('../../../shared/security/learnerContentPolicy');
const {
  getRecallQuizDelivery,
  submitRecallQuiz,
  filterRecallGatedMasteredIds,
} = require('../services/recallQuizService');
const { ingestLearningPathEvents } = require('../services/learningPathEventIngest');
const { attributeGuestLearningSession } = require('../services/sessionAttributionService');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const doc = await LearningPath.findOne({ slug: 'main' }).lean();
    if (!doc) return res.status(404).json({ success: false, code: 'LEARNING_PATH_MISSING', error: 'Chưa có dữ liệu lộ trình' });
    if (!doc.published) return res.status(404).json({ success: false, code: 'LEARNING_PATH_UNAVAILABLE', error: 'Lộ trình chưa khả dụng' });
    const includeQuizSecrets = req.userRole === 'admin';
    const data = applyLearningPathLearnerPolicy(
      { modules: doc.modules || [], concepts: doc.concepts || [] },
      { includeQuizSecrets },
    );
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET learning-path error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (_req, res) => {
  try {
    const doc = await LearningPath.findOne({ slug: 'main' }).lean();
    if (!doc) return res.status(404).json({ success: false, code: 'LEARNING_PATH_MISSING', error: 'Chưa có dữ liệu lộ trình' });
    res.json({ success: true, data: { modules: doc.modules || [], concepts: doc.concepts || [], published: doc.published } });
  } catch (err) {
    console.error('GET learning-path editor error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_EDITOR_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

function normalizeModules(modules) {
  let invalidSectionCount = 0;
  const out = modules.map((mod) => ({
    ...mod,
    nodes: (mod.nodes || []).map((n) => {
      const raw = n.topicWeights;
      const topicWeights = Array.isArray(raw)
        ? raw
            .map((tw) => ({
              topicId: String(tw.topicId || '').trim(),
              weight: Math.max(0, Math.min(1, Number(tw.weight) || 0)),
            }))
            .filter((tw) => tw.topicId && tw.weight > 0.0001)
        : [];
      const normalizeConceptAnchors = (lesson) => {
        const rows = Array.isArray(lesson?.conceptAnchors) ? lesson.conceptAnchors : [];
        return rows
          .map((a) => ({ conceptId: String(a?.conceptId || '').trim(), phrase: String(a?.phrase || '').trim() }))
          .filter((a) => a.conceptId && a.phrase);
      };
      const normalizeRecallQuiz = (lesson) =>
        normalizeQuizList(lesson?.recallQuiz, String(lesson?.id || '').trim(), { maxCount: 5, minCount: 0 });
      const normalizeSceneContext = (lesson) => {
        const sc = lesson?.sceneContext;
        if (!sc || typeof sc !== 'object') return undefined;
        const primaryEntityId = String(sc.primaryEntityId || '').trim();
        const entityIds = Array.isArray(sc.entityIds)
          ? [...new Set(sc.entityIds.map((x) => String(x || '').trim()).filter(Boolean))].filter((id) => id !== primaryEntityId)
          : [];
        const hfRaw = sc.historyFocus;
        let historyFocus;
        if (hfRaw && typeof hfRaw === 'object' && primaryEntityId) {
          const beatId = Number(hfRaw.beatId);
          if (Number.isFinite(beatId)) {
            historyFocus = { beatId };
            const pinId = String(hfRaw.pinId || '').trim();
            if (pinId) historyFocus.pinId = pinId;
            const labelVi = String(hfRaw.labelVi || '').trim();
            if (labelVi) historyFocus.labelVi = labelVi;
          }
        }
        if (!primaryEntityId && entityIds.length === 0 && !historyFocus) return undefined;
        const out = {};
        if (primaryEntityId) out.primaryEntityId = primaryEntityId;
        if (entityIds.length) out.entityIds = entityIds;
        if (historyFocus) out.historyFocus = historyFocus;
        return out;
      };
      const normalizeConceptIds = (lesson) => {
        const { sections, dropped } = coerceLessonSections(lesson?.sections);
        invalidSectionCount += dropped;
        return {
          ...lesson,
          sections,
          conceptIds: Array.isArray(lesson?.conceptIds) ? [...new Set(lesson.conceptIds.map((x) => String(x || '').trim()).filter(Boolean))] : [],
          conceptAnchors: normalizeConceptAnchors(lesson),
          recallQuiz: normalizeRecallQuiz(lesson),
          sceneContext: normalizeSceneContext(lesson),
        };
      };
      const depths = n.depths || {};
      const nextDepths = {
        beginner: Array.isArray(depths.beginner) ? depths.beginner.map(normalizeConceptIds) : [],
        explorer: Array.isArray(depths.explorer) ? depths.explorer.map(normalizeConceptIds) : [],
        researcher: Array.isArray(depths.researcher) ? depths.researcher.map(normalizeConceptIds) : [],
      };
      return { ...n, topicWeights, depths: nextDepths };
    }),
  }));
  return { modules: out, invalidSectionCount };
}

function validateModulesByConceptIds(modules, conceptIdSet) {
  const invalidConceptIds = new Set();
  const filterLesson = (lesson) => {
    const raw = Array.isArray(lesson?.conceptIds) ? lesson.conceptIds : [];
    const kept = raw.filter((id) => conceptIdSet.has(id));
    raw.forEach((id) => { if (!conceptIdSet.has(id)) invalidConceptIds.add(id); });
    const rawAnchors = Array.isArray(lesson?.conceptAnchors) ? lesson.conceptAnchors : [];
    const keptAnchors = rawAnchors.filter((a) => {
      const id = String(a?.conceptId || '').trim();
      if (!id) return false;
      if (!conceptIdSet.has(id)) { invalidConceptIds.add(id); return false; }
      return true;
    });
    return { ...lesson, conceptIds: kept, conceptAnchors: keptAnchors };
  };
  const nextModules = (modules || []).map((m) => ({
    ...m,
    nodes: (m.nodes || []).map((n) => ({
      ...n,
      depths: {
        beginner: Array.isArray(n?.depths?.beginner) ? n.depths.beginner.map(filterLesson) : [],
        explorer: Array.isArray(n?.depths?.explorer) ? n.depths.explorer.map(filterLesson) : [],
        researcher: Array.isArray(n?.depths?.researcher) ? n.depths.researcher.map(filterLesson) : [],
      },
    })),
  }));
  return { modules: nextModules, invalidConceptIds: [...invalidConceptIds] };
}

function normalizeConcepts(concepts) {
  if (!Array.isArray(concepts)) return [];
  return concepts
    .map((c) => ({
      id: String(c.id || '').trim(),
      label: String(c.label || '').trim(),
      labelVi: String(c.labelVi || '').trim(),
      definition: String(c.definition || '').trim(),
      definitionVi: String(c.definitionVi || '').trim(),
      aliases: Array.isArray(c.aliases) ? [...new Set(c.aliases.map((a) => String(a || '').trim()).filter(Boolean))] : [],
    }))
    .filter((c) => c.id && c.definition);
}

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { modules, concepts, published } = req.body || {};
    if (!Array.isArray(modules)) return res.status(400).json({ success: false, error: 'modules phải là mảng' });
    const { modules: normalized, invalidSectionCount } = normalizeModules(modules);
    const normalizedConcepts = Array.isArray(concepts) ? normalizeConcepts(concepts) : null;
    const conceptDocs = await Concept.find({}, { id: 1 }).lean();
    const conceptIdSet = new Set((conceptDocs || []).map((c) => String(c.id || '').trim()).filter(Boolean));
    const { modules: validatedModules, invalidConceptIds } = validateModulesByConceptIds(normalized, conceptIdSet);
    let doc = await LearningPath.findOne({ slug: 'main' });
    if (!doc) {
      doc = new LearningPath({ slug: 'main', modules: validatedModules, concepts: normalizedConcepts ?? [], published: typeof published === 'boolean' ? published : true });
    } else {
      doc.modules = validatedModules;
      if (normalizedConcepts !== null) { doc.concepts = normalizedConcepts; doc.markModified('concepts'); }
      doc.published = typeof published === 'boolean' ? published : true;
      doc.markModified('modules');
    }
    await doc.save();
    try {
      const { scheduleReindexAllLessons } = require('../../agent/services/ragIndexService');
      scheduleReindexAllLessons();
    } catch (e) {
      console.warn('LP save: RAG reindex schedule skipped:', e.message);
    }
    const fresh = await LearningPath.findOne({ slug: 'main' }).lean();
    res.json({
      success: true,
      data: {
        modules: fresh?.modules || [],
        concepts: fresh?.concepts || [],
        published: fresh?.published ?? true,
        invalidConceptIds,
        invalidSectionCount: invalidSectionCount || 0,
      },
    });
  } catch (err) {
    console.error('PUT learning-path editor error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_EDITOR_SAVE_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.post('/editor/generate-quiz', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const result = await generateRecallQuizFromLesson(req.body?.lesson || {});
    if (!result.ok) return res.status(result.status || 422).json({ success: false, code: result.code || 'QUIZ_GENERATION_FAILED', error: result.error || 'Không thể sinh quiz', details: result.details || [] });
    res.json({ success: true, data: { recallQuiz: result.recallQuiz } });
  } catch (err) {
    console.error('POST learning-path generate-quiz error:', err);
    res.status(500).json({ success: false, code: 'QUIZ_GENERATION_FAILED', error: 'Lỗi máy chủ khi sinh quiz' });
  }
});

function normalizeIdArray(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((x) => String(x || '').trim()).filter(Boolean))];
}

function mergeRewardSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const gemsEarned = segments.reduce((s, x) => s + (x?.gemsEarned || 0), 0);
  const levelUp = segments.some((x) => !!x?.levelUp);
  const newAchievements = [];
  const seen = new Set();
  for (const x of segments) {
    for (const a of x?.newAchievements || []) {
      if (!a?.slug || seen.has(a.slug)) continue;
      seen.add(a.slug);
      newAchievements.push(a);
    }
  }
  const lastBalance = segments[segments.length - 1]?.newBalance ?? null;
  const labels = segments.map((x) => x?.label).filter(Boolean);
  return { gemsEarned, newBalance: lastBalance, levelUp, newAchievements, streakResult: segments[segments.length - 1]?.streakResult ?? null, labels, segments };
}

router.get('/lessons/:lessonId/recall-quiz', authMiddleware, async (req, res, next) => {
  try {
    const lessonId = String(req.params.lessonId || '').trim();
    const data = await getRecallQuizDelivery(lessonId);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        code: err.code || 'RECALL_QUIZ_ERROR',
        error: err.message,
      });
    }
    next(err);
  }
});

router.post('/lessons/:lessonId/recall-quiz/submit', authMiddleware, async (req, res, next) => {
  try {
    const lessonId = String(req.params.lessonId || '').trim();
    const answers =
      req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const data = await submitRecallQuiz(req.userId, lessonId, answers);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        code: err.code || 'RECALL_QUIZ_SUBMIT_FAILED',
        error: err.message,
      });
    }
    next(err);
  }
});

router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const doc = await UserProgress.findOne({ userId: req.userId }).lean();
    res.json({
      success: true,
      data: {
        completedLessonIds: normalizeIdArray(doc?.learningPathCompletedLessonIds),
        masteredLessonIds: normalizeIdArray(doc?.learningPathMasteredLessonIds),
        visited3DLessonIds: normalizeIdArray(doc?.learningPathVisited3DLessonIds),
        lastLessonId: String(doc?.learningPathLastLessonId || '').trim() || null,
      },
    });
  } catch (err) {
    console.error('GET learning-path progress error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_PROGRESS_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.put('/progress', authMiddleware, async (req, res) => {
  try {
    const docExisting = await UserProgress.findOne({ userId: req.userId }).lean();
    const completedLessonIds = req.body?.completedLessonIds !== undefined ? normalizeIdArray(req.body.completedLessonIds) : normalizeIdArray(docExisting?.learningPathCompletedLessonIds);
    let masteredLessonIds =
      req.body?.masteredLessonIds !== undefined
        ? normalizeIdArray(req.body.masteredLessonIds)
        : normalizeIdArray(docExisting?.learningPathMasteredLessonIds);
    masteredLessonIds = await filterRecallGatedMasteredIds(req.userId, masteredLessonIds);
    const rawLastExplicit = req.body?.lastLessonId !== undefined ? String(req.body.lastLessonId || '').trim() : '';
    let lastLessonId;
    if (req.body?.lastLessonId !== undefined) {
      lastLessonId = rawLastExplicit && completedLessonIds.includes(rawLastExplicit) ? rawLastExplicit : '';
    } else {
      const prev = String(docExisting?.learningPathLastLessonId || '').trim();
      lastLessonId = prev && completedLessonIds.includes(prev) ? prev : '';
    }
    let visited3DLessonIds = normalizeIdArray(docExisting?.learningPathVisited3DLessonIds);
    if (Array.isArray(req.body?.visited3DLessonIds)) visited3DLessonIds = normalizeIdArray([...visited3DLessonIds, ...normalizeIdArray(req.body.visited3DLessonIds)]);
    const setDoc = {
      learningPathCompletedLessonIds: completedLessonIds,
      learningPathMasteredLessonIds: masteredLessonIds,
      learningPathLastLessonId: lastLessonId,
      learningPathVisited3DLessonIds: visited3DLessonIds,
    };
    const doc = await UserProgress.findOneAndUpdate({ userId: req.userId }, { $set: setDoc }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    res.json({
      success: true,
      data: {
        completedLessonIds: normalizeIdArray(doc?.learningPathCompletedLessonIds),
        masteredLessonIds: normalizeIdArray(doc?.learningPathMasteredLessonIds),
        visited3DLessonIds: normalizeIdArray(doc?.learningPathVisited3DLessonIds),
        lastLessonId: String(doc?.learningPathLastLessonId || '').trim() || null,
      },
    });
  } catch (err) {
    console.error('PUT learning-path progress error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_PROGRESS_SAVE_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.get('/solar-journey/progress', authMiddleware, async (req, res) => {
  try {
    const doc = await UserProgress.findOne({ userId: req.userId }).lean();
    res.json({ success: true, data: { completedMilestoneIds: normalizeIdArray(doc?.solarJourneyCompletedMilestoneIds) } });
  } catch (err) {
    console.error('GET solar journey progress error:', err);
    res.status(500).json({ success: false, code: 'SOLAR_PROGRESS_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.put('/solar-journey/progress', authMiddleware, async (req, res) => {
  try {
    const completedMilestoneIds = normalizeIdArray(req.body?.completedMilestoneIds);
    const doc = await UserProgress.findOneAndUpdate(
      { userId: req.userId },
      { $set: { solarJourneyCompletedMilestoneIds: completedMilestoneIds } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ success: true, data: { completedMilestoneIds: normalizeIdArray(doc?.solarJourneyCompletedMilestoneIds) } });
  } catch (err) {
    console.error('PUT solar journey progress error:', err);
    res.status(500).json({ success: false, code: 'SOLAR_PROGRESS_SAVE_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.post('/attribute-session', authMiddleware, async (req, res) => {
  try {
    const anonSessionId = String(req.body?.anonSessionId || '').trim();
    const result = await attributeGuestLearningSession(req.userId, anonSessionId);
    if (!result.ok) {
      return res.status(400).json({ success: false, code: result.code, error: result.error });
    }
    res.json({ success: true, data: { matched: result.matched, modified: result.modified } });
  } catch (err) {
    console.error('POST learning-path attribute-session error:', err);
    res.status(500).json({ success: false, code: 'ATTRIBUTE_SESSION_FAILED', error: 'Lỗi máy chủ' });
  }
});

router.post('/events/batch', optionalAuth, async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) return res.status(400).json({ success: false, code: 'LEARNING_PATH_EVENTS_EMPTY', error: 'events phải là mảng có dữ liệu' });
    if (events.length > 100) return res.status(400).json({ success: false, code: 'LEARNING_PATH_EVENTS_TOO_LARGE', error: 'Tối đa 100 events mỗi batch' });

    const { normalized, inserted, rejections } = await ingestLearningPathEvents(events, req.userId || null);

    let rewards = null;
    if (req.userId && inserted.length > 0) {
      const segments = [];
      for (const ev of inserted) {
        const results = await emitAsync('learning.event.processed', { userId: req.userId, event: ev });
        for (const r of results) if (r && r.gemsEarned > 0) segments.push(r);
      }
      if (segments.length) rewards = mergeRewardSegments(segments);
    }
    res.json({
      success: true,
      data: {
        acceptedCount: normalized.length,
        insertedCount: inserted.length,
        duplicateCount: Math.max(0, normalized.length - inserted.length),
        rejectedCount: rejections.length,
        rejections,
        rewards,
      },
    });
  } catch (err) {
    console.error('POST learning-path events batch error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_EVENTS_BATCH_FAILED', error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
