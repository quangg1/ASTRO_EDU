const express = require('express');
const fs = require('fs');
const path = require('path');
const LearningPath = require('../models/LearningPath');
const Concept = require('../models/Concept');
const UserProgress = require('../models/UserProgress');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

function loadDefaultSeed() {
  try {
    const p = path.join(__dirname, '../../../data/learningPathDefault.json');
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    if (!data.modules || !Array.isArray(data.modules)) return null;
    return {
      modules: data.modules,
      concepts: Array.isArray(data.concepts) ? data.concepts : [],
    };
  } catch (e) {
    console.error('learningPath default seed read error:', e);
    return null;
  }
}

async function ensureMainPath() {
  let doc = await LearningPath.findOne({ slug: 'main' }).lean();
  if (doc) return doc;
  const seed = loadDefaultSeed();
  const modules = seed?.modules;
  const concepts = seed?.concepts || [];
  if (!modules || modules.length === 0) {
    console.warn('LearningPath: no seed file; create empty document');
    doc = await LearningPath.create({ slug: 'main', published: true, modules: [], concepts: [] });
    return doc.toObject();
  }
  doc = await LearningPath.create({ slug: 'main', published: true, modules, concepts });
  return doc.toObject();
}

/** Public: published learning path */
router.get('/', async (req, res) => {
  try {
    const doc = await ensureMainPath();
    if (!doc.published) {
      return res.status(404).json({ success: false, error: 'Not available' });
    }
    res.json({ success: true, data: { modules: doc.modules || [], concepts: doc.concepts || [] } });
  } catch (err) {
    console.error('GET learning-path error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/** Editor: full document (teacher/admin) */
router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const doc = await ensureMainPath();
    res.json({
      success: true,
      data: { modules: doc.modules || [], concepts: doc.concepts || [], published: doc.published },
    });
  } catch (err) {
    console.error('GET learning-path editor error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
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
      const normalizeConceptIds = (lesson) => ({
        ...lesson,
        conceptIds: Array.isArray(lesson?.conceptIds)
          ? [...new Set(lesson.conceptIds.map((x) => String(x || '').trim()).filter(Boolean))]
          : [],
        conceptAnchors: normalizeConceptAnchors(lesson),
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

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { modules, concepts, published } = req.body || {};
    if (!Array.isArray(modules)) {
      return res.status(400).json({ success: false, error: 'modules phải là mảng' });
    }
    const normalized = normalizeModules(modules);
    /** Chỉ ghi concepts nhúng trong document khi client gửi — tránh xóa sạch khi body thiếu concepts */
    const normalizedConcepts =
      Array.isArray(concepts) ? normalizeConcepts(concepts) : null;
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
        published: typeof published === 'boolean' ? published : true,
      });
    } else {
      doc.modules = validatedModules;
      if (normalizedConcepts !== null) {
        doc.concepts = normalizedConcepts;
        doc.markModified('concepts');
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
        published: fresh?.published ?? true,
        invalidConceptIds,
      },
    });
  } catch (err) {
    console.error('PUT learning-path editor error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
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
        lastLessonId: String(doc?.learningPathLastLessonId || '').trim() || null,
      },
    });
  } catch (err) {
    console.error('GET learning-path progress error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/progress', authMiddleware, async (req, res) => {
  try {
    const completedLessonIds = normalizeIdArray(req.body?.completedLessonIds);
    const rawLast = String(req.body?.lastLessonId || '').trim();
    const lastLessonId = rawLast && completedLessonIds.includes(rawLast) ? rawLast : '';
    const doc = await UserProgress.findOneAndUpdate(
      { userId: req.userId },
      { $set: { learningPathCompletedLessonIds: completedLessonIds, learningPathLastLessonId: lastLessonId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({
      success: true,
      data: {
        completedLessonIds: normalizeIdArray(doc?.learningPathCompletedLessonIds),
        lastLessonId: String(doc?.learningPathLastLessonId || '').trim() || null,
      },
    });
  } catch (err) {
    console.error('PUT learning-path progress error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
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
    res.status(500).json({ success: false, error: 'Server error' });
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
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
