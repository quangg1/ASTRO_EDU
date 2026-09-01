const { AppError } = require('../../../shared/errors');
const {
  learningPathRepository,
  userProgressRepository,
} = require('../repositories/learningPathRepository');
const { collectLpLessons } = require('../lib/collectLpLessons');
const { normalizeQuizList } = require('../../../shared/quizQuestion');
const { sanitizeQuizQuestionForDelivery } = require('../../courses/services/courseContentRedact');
const { gradeAnswers } = require('../../courses/services/quizExamService');
const { recordRecallQuizSubmit } = require('../../learning-state/services/learningStateEngine');

let recallGatedLessonIdsCache = null;
let recallGatedCacheAt = 0;
const GATE_CACHE_MS = 60_000;

/** Dưới 3 câu thì điểm số không đủ tin cậy để coi là đã thành thạo. */
const MIN_RECALL_QUESTIONS = 3;

const lessonNotFound = () =>
  new AppError(404, 'LESSON_NOT_FOUND', 'Không tìm thấy bài trong lộ trình');

async function loadLearningPathDoc() {
  return learningPathRepository.findMainPublished();
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
      if (getRecallQuestionsFull(lesson).length >= MIN_RECALL_QUESTIONS) {
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
  if (!hit) throw lessonNotFound();

  const questions = getRecallQuestionsFull(hit.lesson);
  if (questions.length < MIN_RECALL_QUESTIONS) {
    throw new AppError(404, 'RECALL_QUIZ_UNAVAILABLE', 'Bài này chưa có kiểm tra nhanh (mastery)');
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
  if (!userId) throw new AppError(401, 'AUTH_REQUIRED', 'Đăng nhập để nộp bài kiểm tra');

  const hit = await findLpLessonById(lessonId);
  if (!hit) throw lessonNotFound();

  const questions = getRecallQuestionsFull(hit.lesson);

  const normalizedAnswers = {};
  for (const question of questions) {
    const raw = answers?.[question.id];
    if (raw === undefined || raw === null) {
      throw new AppError(400, 'INCOMPLETE_ANSWERS', 'Chưa trả lời đủ câu hỏi');
    }
    const index = Number(raw);
    if (!Number.isFinite(index) || index < 0 || index >= (question.options || []).length) {
      throw new AppError(400, 'INVALID_ANSWER', 'Đáp án không hợp lệ');
    }
    normalizedAnswers[question.id] = Math.floor(index);
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

  const doc = await userProgressRepository.findForUser(userId, {
    projection: 'learningPathMasteredLessonIds',
  });
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
