const LearningPath = require('../models/LearningPath');
const UserProgress = require('../models/UserProgress');
const { collectLpLessons } = require('../lib/collectLpLessons');
const { normalizeQuizList } = require('../../../shared/quizQuestion');
const { sanitizeQuizQuestionForDelivery } = require('../../courses/services/courseContentRedact');
const { gradeAnswers } = require('../../courses/services/quizExamService');
const { recordRecallQuizSubmit } = require('../../learning-state/services/learningStateEngine');

let recallGatedLessonIdsCache = null;
let recallGatedCacheAt = 0;
const GATE_CACHE_MS = 60_000;

async function loadLearningPathDoc() {
  return LearningPath.findOne({ slug: 'main', published: { $ne: false } })
    .select('modules concepts published')
    .lean();
}

/**
 * @param {string} lessonId
 */
async function findLpLessonById(lessonId) {
  const id = String(lessonId || '').trim();
  if (!id) return null;
  const doc = await loadLearningPathDoc();
  if (!doc) return null;
  for (const row of collectLpLessons(doc)) {
    if (String(row.lesson?.id || '').trim() === id) return { doc, ...row };
  }
  return null;
}

function getRecallQuestionsFull(lesson) {
  const lessonId = String(lesson?.id || '').trim();
  const list = normalizeQuizList(lesson?.recallQuiz, lessonId, { maxCount: 5, minCount: 3 });
  return list.filter((q) => q.type === 'mcq' && (q.options || []).length >= 3);
}

async function getRecallGatedLessonIdSet() {
  const now = Date.now();
  if (recallGatedLessonIdsCache && now - recallGatedCacheAt < GATE_CACHE_MS) {
    return recallGatedLessonIdsCache;
  }
  const doc = await loadLearningPathDoc();
  const set = new Set();
  if (doc) {
    for (const { lesson } of collectLpLessons(doc)) {
      if (getRecallQuestionsFull(lesson).length >= 3) {
        set.add(String(lesson.id).trim());
      }
    }
  }
  recallGatedLessonIdsCache = set;
  recallGatedCacheAt = now;
  return set;
}

/**
 * @param {string} lessonId
 */
async function getRecallQuizDelivery(lessonId) {
  const hit = await findLpLessonById(lessonId);
  if (!hit) {
    const err = new Error('Không tìm thấy bài trong lộ trình');
    err.status = 404;
    err.code = 'LESSON_NOT_FOUND';
    throw err;
  }
  const questions = getRecallQuestionsFull(hit.lesson);
  if (questions.length < 3) {
    const err = new Error('Bài này chưa có kiểm tra nhanh (mastery)');
    err.status = 404;
    err.code = 'RECALL_QUIZ_UNAVAILABLE';
    throw err;
  }
  return {
    lessonId: String(hit.lesson.id),
    lessonTitle: hit.lesson.titleVi || hit.lesson.title || hit.lesson.id,
    moduleId: hit.mod?.id || null,
    nodeId: hit.node?.id || null,
    depth: hit.depth || null,
    questions: questions.map((q, i) => sanitizeQuizQuestionForDelivery(q, i)),
  };
}

/**
 * @param {string} userId
 * @param {string} lessonId
 * @param {Record<string, number>} answers
 */
async function submitRecallQuiz(userId, lessonId, answers) {
  if (!userId) {
    const err = new Error('Đăng nhập để nộp bài kiểm tra');
    err.status = 401;
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  const hit = await findLpLessonById(lessonId);
  if (!hit) {
    const err = new Error('Không tìm thấy bài trong lộ trình');
    err.status = 404;
    err.code = 'LESSON_NOT_FOUND';
    throw err;
  }
  const questions = getRecallQuestionsFull(hit.lesson);

  const normalizedAnswers = {};
  for (const q of questions) {
    const raw = answers?.[q.id];
    if (raw === undefined || raw === null) {
      const err = new Error('Chưa trả lời đủ câu hỏi');
      err.status = 400;
      err.code = 'INCOMPLETE_ANSWERS';
      throw err;
    }
    const idx = Number(raw);
    if (!Number.isFinite(idx) || idx < 0 || idx >= (q.options || []).length) {
      const err = new Error('Đáp án không hợp lệ');
      err.status = 400;
      err.code = 'INVALID_ANSWER';
      throw err;
    }
    normalizedAnswers[q.id] = Math.floor(idx);
  }

  const graded = gradeAnswers(questions, normalizedAnswers);
  const passed = graded.total > 0 && graded.correct === graded.total;

  await recordRecallQuizSubmit(userId, String(hit.lesson.id).trim(), graded);

  return {
    passed,
    score: graded.score,
    correctCount: graded.correct,
    total: graded.total,
    perQuestion: graded.perQuestion.map((row) => ({
      questionId: row.questionId,
      correct: row.correct,
      correctIndex: row.correctIndex,
      explanation: row.explanation || null,
    })),
    lessonId: String(hit.lesson.id).trim(),
    alreadyMastered: false,
  };
}

/**
 * Chặn ghi mastery qua PUT progress nếu bài có recall gate mà chưa được server cấp.
 * @param {string} userId
 * @param {string[]} requestedMasteredIds
 */
async function filterRecallGatedMasteredIds(userId, requestedMasteredIds) {
  const gated = await getRecallGatedLessonIdSet();
  if (!gated.size) return requestedMasteredIds;

  const doc = await UserProgress.findOne({ userId }).select('learningPathMasteredLessonIds').lean();
  const existing = new Set((doc?.learningPathMasteredLessonIds || []).map(String));

  return (requestedMasteredIds || []).filter((id) => {
    const lid = String(id || '').trim();
    if (!lid) return false;
    if (!gated.has(lid)) return true;
    return existing.has(lid);
  });
}

module.exports = {
  findLpLessonById,
  getRecallQuestionsFull,
  getRecallQuizDelivery,
  submitRecallQuiz,
  filterRecallGatedMasteredIds,
  getRecallGatedLessonIdSet,
};
