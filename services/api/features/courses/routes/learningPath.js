const express = require('express');
const LearningPath = require('../models/LearningPath');
const UserProgress = require('../models/UserProgress');
const LearningPathEvent = require('../models/LearningPathEvent');
const Concept = require('../models/Concept');
const { authMiddleware, optionalAuth, requireRole } = require('../../../shared/jwtAuth');
const { generateRecallQuizFromLesson } = require('../../../lib/ai/tasks/generateRecallQuiz');

const router = express.Router();

/** Public: published learning path */
router.get('/', async (req, res) => {
  try {
    const doc = await LearningPath.findOne({ slug: 'main' }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, code: 'LEARNING_PATH_MISSING', error: 'Chưa có dữ liệu lộ trình' });
    }
    if (!doc.published) {
      return res.status(404).json({ success: false, code: 'LEARNING_PATH_UNAVAILABLE', error: 'Lộ trình chưa khả dụng' });
    }
    res.json({
      success: true,
      data: {
        modules: doc.modules || [],
        concepts: doc.concepts || [],
        bridgeRules: Array.isArray(doc.bridgeRules) ? doc.bridgeRules : [],
      },
    });
  } catch (err) {
    console.error('GET learning-path error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

/** Editor: full document (teacher/admin) */
router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const doc = await LearningPath.findOne({ slug: 'main' }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, code: 'LEARNING_PATH_MISSING', error: 'Chưa có dữ liệu lộ trình' });
    }
    res.json({
      success: true,
      data: {
        modules: doc.modules || [],
        concepts: doc.concepts || [],
        bridgeRules: Array.isArray(doc.bridgeRules) ? doc.bridgeRules : [],
        published: doc.published,
      },
    });
  } catch (err) {
    console.error('GET learning-path editor error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_EDITOR_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

/** Chuẩn hóa topicWeights trên từng node (0–1, bỏ gần 0) để Mongoose ghi đúng. */
function normalizeModules(modules) {
  return modules.map((mod) => ({
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
        const raw = Array.isArray(lesson?.conceptAnchors) ? lesson.conceptAnchors : [];
        const anchors = raw
          .map((a) => ({
            conceptId: String(a?.conceptId || '').trim(),
            phrase: String(a?.phrase || '').trim(),
          }))
          .filter((a) => a.conceptId && a.phrase);
        return anchors;
      };
      const normalizeRecallQuiz = (lesson) => {
        const raw = Array.isArray(lesson?.recallQuiz) ? lesson.recallQuiz : [];
        return raw
          .slice(0, 5)
          .map((q, idx) => {
            const question = String(q?.question || '').trim();
            const rawOpts = Array.isArray(q?.options) ? q.options : [];
            const rawExpl = Array.isArray(q?.optionExplanations) ? q.optionExplanations : [];
            const pairs = rawOpts
              .map((o, i) => ({
                text: String(o || '').trim(),
                reason: String(rawExpl[i] || '').trim(),
                orig: i,
              }))
              .filter((p) => p.text);
            const options = pairs.map((p) => p.text);
            const ciRaw = Number(q?.correctIndex);
            const ciSafe = Number.isFinite(ciRaw) ? ciRaw : 0;
            const mappedIdx = pairs.findIndex((p) => p.orig === ciSafe);
            const correctIndex = Math.max(0, Math.min(mappedIdx >= 0 ? mappedIdx : 0, Math.max(0, options.length - 1)));
            const optionExplanations = pairs.map((p, i) => p.reason || (i === correctIndex ? 'Đây là đáp án đúng theo nội dung bài học.' : 'Phương án này chưa khớp với nội dung bài học.'));
            return {
              id: String(q?.id || '').trim() || `rq-${String(lesson?.id || 'lesson')}-${idx}`,
              question,
              options,
              correctIndex,
              optionExplanations,
            };
          })
          .filter((q) => q.question && q.options.length >= 3 && q.options[q.correctIndex]);
      };
      const normalizeConceptIds = (lesson) => ({
        ...lesson,
        conceptIds: Array.isArray(lesson?.conceptIds)
          ? [...new Set(lesson.conceptIds.map((x) => String(x || '').trim()).filter(Boolean))]
          : [],
        conceptAnchors: normalizeConceptAnchors(lesson),
        recallQuiz: normalizeRecallQuiz(lesson),
      });
      const depths = n.depths || {};
      const nextDepths = {
        beginner: Array.isArray(depths.beginner) ? depths.beginner.map(normalizeConceptIds) : [],
        explorer: Array.isArray(depths.explorer) ? depths.explorer.map(normalizeConceptIds) : [],
        researcher: Array.isArray(depths.researcher) ? depths.researcher.map(normalizeConceptIds) : [],
      };
      return { ...n, topicWeights, depths: nextDepths };
    }),
  }));
}

/**
 * Chỉ giữ conceptIds tồn tại trong Concept library global.
 * Đồng thời trả ra danh sách id invalid để editor hiển thị cảnh báo.
 */
function validateModulesByConceptIds(modules, conceptIdSet) {
  const invalidConceptIds = new Set();
  const filterLesson = (lesson) => {
    const raw = Array.isArray(lesson?.conceptIds) ? lesson.conceptIds : [];
    const kept = raw.filter((id) => conceptIdSet.has(id));
    raw.forEach((id) => {
      if (!conceptIdSet.has(id)) invalidConceptIds.add(id);
    });
    const rawAnchors = Array.isArray(lesson?.conceptAnchors) ? lesson.conceptAnchors : [];
    const keptAnchors = rawAnchors.filter((a) => {
      const id = String(a?.conceptId || '').trim();
      if (!id) return false;
      if (!conceptIdSet.has(id)) {
        invalidConceptIds.add(id);
        return false;
      }
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
      aliases: Array.isArray(c.aliases)
        ? [...new Set(c.aliases.map((a) => String(a || '').trim()).filter(Boolean))]
        : [],
    }))
    .filter((c) => c.id && c.definition);
}

function normalizeBridgeRules(rules) {
  if (!Array.isArray(rules)) return [];
  const allowedEvents = new Set([
    'entity_focus_stable',
    'entity_clicked',
    'entity_discovered_first_time',
    'entity_focus_duration',
  ]);
  const allowedActions = new Set([
    'show_concept_overlay',
    'mark_lessons_visited3d',
    'trigger_contextual_quiz',
    'unlock_discovery_badge',
  ]);
  return rules
    .map((r, idx) => {
      const id = String(r?.id || '').trim() || `rule-${Date.now()}-${idx}`;
      const entityId = String(r?.entityId || '').trim();
      const event = String(r?.event || '').trim();
      const action = String(r?.action || '').trim();
      const conceptId = String(r?.conceptId || '').trim();
      const active = r?.active !== false;
      const thresholdSecRaw = Number(r?.thresholdSec);
      const thresholdSec = Number.isFinite(thresholdSecRaw)
        ? Math.max(0, Math.min(60, thresholdSecRaw))
        : null;
      if (!entityId || !allowedEvents.has(event) || !allowedActions.has(action)) return null;
      return { id, entityId, event, action, conceptId, thresholdSec, active };
    })
    .filter(Boolean);
}

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { modules, concepts, bridgeRules, published } = req.body || {};
    if (!Array.isArray(modules)) {
      return res.status(400).json({ success: false, error: 'modules phải là mảng' });
    }
    const normalized = normalizeModules(modules);
    /** Chỉ ghi concepts nhúng trong document khi client gửi — tránh xóa sạch khi body thiếu concepts */
    const normalizedConcepts =
      Array.isArray(concepts) ? normalizeConcepts(concepts) : null;
    const normalizedBridgeRules =
      Array.isArray(bridgeRules) ? normalizeBridgeRules(bridgeRules) : null;
    const conceptDocs = await Concept.find({}, { id: 1 }).lean();
    const conceptIdSet = new Set((conceptDocs || []).map((c) => String(c.id || '').trim()).filter(Boolean));
    const { modules: validatedModules, invalidConceptIds } = validateModulesByConceptIds(
      normalized,
      conceptIdSet,
    );
    let doc = await LearningPath.findOne({ slug: 'main' });
    if (!doc) {
      doc = new LearningPath({
        slug: 'main',
        modules: validatedModules,
        concepts: normalizedConcepts ?? [],
        bridgeRules: normalizedBridgeRules ?? [],
        published: typeof published === 'boolean' ? published : true,
      });
    } else {
      doc.modules = validatedModules;
      if (normalizedConcepts !== null) {
        doc.concepts = normalizedConcepts;
        doc.markModified('concepts');
      }
      if (normalizedBridgeRules !== null) {
        doc.bridgeRules = normalizedBridgeRules;
        doc.markModified('bridgeRules');
      }
      doc.published = typeof published === 'boolean' ? published : true;
      doc.markModified('modules');
    }
    await doc.save();
    /** Đọc lại từ DB (lean) để response khớp dữ liệu đã ghi — tránh toObject() thiếu path lồng nhau */
    const fresh = await LearningPath.findOne({ slug: 'main' }).lean();
    res.json({
      success: true,
      data: {
        modules: fresh?.modules || [],
        concepts: fresh?.concepts || [],
        bridgeRules: Array.isArray(fresh?.bridgeRules) ? fresh.bridgeRules : [],
        published: fresh?.published ?? true,
        invalidConceptIds,
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
    if (!result.ok) {
      return res.status(result.status || 422).json({
        success: false,
        code: result.code || 'QUIZ_GENERATION_FAILED',
        error: result.error || 'Không thể sinh quiz',
        details: result.details || [],
      });
    }
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

router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const doc = await UserProgress.findOne({ userId: req.userId }).lean();
    res.json({
      success: true,
      data: {
        completedLessonIds: normalizeIdArray(doc?.learningPathCompletedLessonIds),
        masteredLessonIds: normalizeIdArray(doc?.learningPathMasteredLessonIds),
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
    const completedLessonIds = normalizeIdArray(req.body?.completedLessonIds);
    const masteredLessonIds = normalizeIdArray(req.body?.masteredLessonIds);
    const rawLast = String(req.body?.lastLessonId || '').trim();
    const lastLessonId = rawLast && completedLessonIds.includes(rawLast) ? rawLast : '';
    const setDoc = {
      learningPathCompletedLessonIds: completedLessonIds,
      learningPathLastLessonId: lastLessonId,
    };
    if (Array.isArray(req.body?.masteredLessonIds)) {
      setDoc.learningPathMasteredLessonIds = masteredLessonIds;
    }
    const doc = await UserProgress.findOneAndUpdate({ userId: req.userId }, { $set: setDoc }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    res.json({
      success: true,
      data: {
        completedLessonIds: normalizeIdArray(doc?.learningPathCompletedLessonIds),
        masteredLessonIds: normalizeIdArray(doc?.learningPathMasteredLessonIds),
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
    res.json({
      success: true,
      data: {
        completedMilestoneIds: normalizeIdArray(doc?.solarJourneyCompletedMilestoneIds),
      },
    });
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
    res.json({
      success: true,
      data: {
        completedMilestoneIds: normalizeIdArray(doc?.solarJourneyCompletedMilestoneIds),
      },
    });
  } catch (err) {
    console.error('PUT solar journey progress error:', err);
    res.status(500).json({ success: false, code: 'SOLAR_PROGRESS_SAVE_FAILED', error: 'Lỗi máy chủ' });
  }
});

function normalizeClient(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'android' || value === 'ios') return value;
  return 'web';
}

function normalizeEvent(rawEvent, userId) {
  const allowed = new Set([
    'lp_module_viewed',
    'lp_node_viewed',
    'lp_lesson_opened',
    'lp_lesson_completed_toggled',
    'lp_lesson_dwell',
    'lp_lesson_mastered',
    'lp_concept_opened',
    'lp_concept_anchor_clicked',
    'lp_depth_switched',
    'lp_path_exited',
    'scene_entity_focus_duration',
    'scene_entity_clicked',
    'scene_concept_overlay_shown',
    'scene_contextual_quiz_prompted',
    'scene_entity_discovered',
  ]);

  const eventName = String(rawEvent?.eventName || '').trim();
  const sessionId = String(rawEvent?.sessionId || '').trim();
  const depthRaw = String(rawEvent?.depth || '').trim();
  const depth = ['beginner', 'explorer', 'researcher'].includes(depthRaw) ? depthRaw : null;

  if (!eventName || !allowed.has(eventName)) return null;
  if (!sessionId) return null;

  const timestampRaw = rawEvent?.timestamp ? new Date(rawEvent.timestamp) : new Date();
  const timestamp = Number.isNaN(timestampRaw.getTime()) ? new Date() : timestampRaw;

  return {
    userId: userId || null,
    sessionId,
    eventName,
    timestamp,
    moduleId: rawEvent?.moduleId ? String(rawEvent.moduleId).trim() : null,
    nodeId: rawEvent?.nodeId ? String(rawEvent.nodeId).trim() : null,
    lessonId: rawEvent?.lessonId ? String(rawEvent.lessonId).trim() : null,
    depth,
    durationSec: Number.isFinite(Number(rawEvent?.durationSec)) ? Number(rawEvent.durationSec) : null,
    activeSec: Number.isFinite(Number(rawEvent?.activeSec)) ? Number(rawEvent.activeSec) : null,
    idleSec: Number.isFinite(Number(rawEvent?.idleSec)) ? Number(rawEvent.idleSec) : null,
    completed: typeof rawEvent?.completed === 'boolean' ? rawEvent.completed : null,
    client: normalizeClient(rawEvent?.client),
    appVersion: rawEvent?.appVersion ? String(rawEvent.appVersion).trim() : null,
    metadata: rawEvent?.metadata && typeof rawEvent.metadata === 'object' ? rawEvent.metadata : {},
  };
}

router.post('/events/batch', optionalAuth, async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (!events.length) {
      return res.status(400).json({ success: false, code: 'LEARNING_PATH_EVENTS_EMPTY', error: 'events phải là mảng có dữ liệu' });
    }
    if (events.length > 100) {
      return res.status(400).json({ success: false, code: 'LEARNING_PATH_EVENTS_TOO_LARGE', error: 'Tối đa 100 events mỗi batch' });
    }

    const normalized = [];
    const rejections = [];

    events.forEach((event, index) => {
      const item = normalizeEvent(event, req.userId || null);
      if (!item) {
        rejections.push({ index, reason: 'invalid_event_shape' });
        return;
      }
      normalized.push(item);
    });

    if (normalized.length > 0) {
      await LearningPathEvent.insertMany(normalized, { ordered: false });
    }

    res.json({
      success: true,
      data: {
        acceptedCount: normalized.length,
        rejectedCount: rejections.length,
        rejections,
      },
    });
  } catch (err) {
    console.error('POST learning-path events batch error:', err);
    res.status(500).json({ success: false, code: 'LEARNING_PATH_EVENTS_BATCH_FAILED', error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
