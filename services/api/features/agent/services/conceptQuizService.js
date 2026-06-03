const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');
const { sanitizeQuizQuestionForDelivery } = require('../../courses/services/courseContentRedact');
const { gradeAnswers } = require('../../courses/services/quizExamService');
const {
  createConceptQuizSession,
  getConceptQuizSession,
  deleteConceptQuizSession,
} = require('./conceptQuizSessionStore');
const { recordConceptQuizSubmit } = require('../../learning-state/services/learningStateEngine');

const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:5005').replace(/\/$/, '');

/** Chuẩn hóa quiz sinh từ LLM (options string + correctIndex) cho chấm điểm server. */
function normalizeGeneratedConceptQuestion(q, idx, conceptId) {
  const base = q && typeof q === 'object' ? q : {};
  const options = (base.options || []).map((o) => {
    if (typeof o === 'string') return { text: o.trim() };
    return { text: String(o?.text ?? '').trim() };
  });
  let answer = typeof base.answer === 'number' ? base.answer : Number(base.correctIndex);
  if (!Number.isFinite(answer)) answer = 0;
  answer = Math.max(0, Math.min(options.length - 1, Math.floor(answer)));
  return {
    id: base.id || `cq-${conceptId || 'concept'}-${idx}`,
    type: base.type || 'mcq',
    question: base.question,
    options,
    answer,
    optionExplanations: base.optionExplanations,
  };
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} conceptId
 * @param {string} [lessonId]
 */
async function buildConceptSourceText(conceptId, lessonId) {
  const { byId, concepts, byConceptId } = await getLearningPathLessonIndex();
  const cid = String(conceptId || '').trim();
  const concept = concepts.get(cid);
  if (!concept) return null;

  const lessonIds = [];
  if (lessonId && byId.has(lessonId)) lessonIds.push(lessonId);
  for (const lid of byConceptId.get(cid) || []) {
    if (!lessonIds.includes(lid)) lessonIds.push(lid);
  }

  const chunks = [`Concept: ${concept.title} (id=${cid})`];
  for (const lid of lessonIds.slice(0, 3)) {
    const hit = byId.get(lid);
    if (!hit) continue;
    chunks.push(`\n--- Bài ${hit.titleVi} (${lid}) ---`);
    if (hit.body) chunks.push(stripHtml(hit.body).slice(0, 3500));
    for (const sec of (hit.sections || []).slice(0, 6)) {
      if (sec.title) chunks.push(`Mục: ${sec.title}`);
      if (sec.excerpt) chunks.push(sec.excerpt);
    }
  }
  const source = chunks.join('\n').trim();
  if (source.length < 80) return null;
  return { concept, source: source.slice(0, 12000), lessonId: lessonIds[0] || lessonId || null };
}

/**
 * @param {{ conceptId: string, lessonId?: string, q?: string }} opts
 */
async function generateConceptQuizForAgent(userId, tier, opts = {}, heavyCtx = null) {
  if (heavyCtx?.has?.('concept_quiz')) {
    const err = new Error('Chỉ một quiz concept mỗi tin nhắn trợ lý.');
    err.status = 429;
    err.code = 'HEAVY_OP_PER_TURN';
    throw err;
  }

  if (heavyCtx?.add) heavyCtx.add('concept_quiz');

  let conceptId = typeof opts.conceptId === 'string' ? opts.conceptId.trim() : '';
  const lessonId = typeof opts.lessonId === 'string' ? opts.lessonId.trim() : '';
  const q = typeof opts.q === 'string' ? opts.q.trim() : '';

  if (!conceptId && lessonId) {
    const { byId } = await getLearningPathLessonIndex();
    const hit = byId.get(lessonId);
    conceptId = hit?.conceptIds?.[0] || '';
  }
  if (!conceptId && q) {
    const { concepts } = await getLearningPathLessonIndex();
    const key = q.toLowerCase();
    for (const [id, row] of concepts) {
      if (String(row.title || '').toLowerCase().includes(key)) {
        conceptId = id;
        break;
      }
    }
  }
  if (!conceptId) {
    const err = new Error('Cần concept_id hoặc đang ở bài có concept gắn.');
    err.status = 400;
    err.code = 'CONCEPT_REQUIRED';
    throw err;
  }

  const built = await buildConceptSourceText(conceptId, lessonId);
  if (!built) {
    const err = new Error('Không đủ nội dung LP cho concept này.');
    err.status = 400;
    err.code = 'CONCEPT_SOURCE_TOO_SHORT';
    throw err;
  }

  const res = await fetch(`${AI_URL}/quiz/generate-concept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concept_id: conceptId,
      concept_title: built.concept.title,
      lesson_id: built.lessonId,
      source_text: built.source,
      focus_q: q || null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.error || 'Không sinh được quiz concept');
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.code = 'CONCEPT_QUIZ_GENERATE_FAILED';
    throw err;
  }

  const rawQuiz = Array.isArray(data.quiz) ? data.quiz : [];
  const fullQuestions = rawQuiz.map((row, i) =>
    normalizeGeneratedConceptQuestion(row, i, conceptId),
  );
  if (fullQuestions.length < 3) {
    const err = new Error('Quiz concept chưa đủ câu hợp lệ.');
    err.status = 502;
    err.code = 'CONCEPT_QUIZ_INVALID';
    throw err;
  }

  const sessionId = createConceptQuizSession(userId, {
    conceptId,
    conceptTitle: built.concept.title,
    lessonId: built.lessonId,
    questions: fullQuestions,
  });

  return {
    quizSessionId: sessionId,
    conceptId,
    conceptTitle: built.concept.title,
    lessonId: built.lessonId,
    questionCount: fullQuestions.length,
    questions: fullQuestions.map((row, i) => sanitizeQuizQuestionForDelivery(row, i)),
  };
}

/**
 * @param {string} userId
 * @param {string} sessionId
 * @param {Record<string, number>} answers
 */
async function submitConceptQuizSession(userId, sessionId, answers) {
  const row = getConceptQuizSession(sessionId, userId);
  if (!row) {
    const err = new Error('Phiên quiz đã hết hạn — hãy nhờ trợ lý tạo lại.');
    err.status = 404;
    err.code = 'CONCEPT_QUIZ_SESSION_EXPIRED';
    throw err;
  }

  const graded = gradeAnswers(row.questions, answers || {});
  deleteConceptQuizSession(sessionId);
  const passed = graded.total > 0 && graded.score >= 60;

  await recordConceptQuizSubmit(userId, {
    lessonId: row.lessonId,
    conceptId: row.conceptId,
    passed,
    score: graded.score,
  });

  return {
    conceptId: row.conceptId,
    conceptTitle: row.conceptTitle,
    lessonId: row.lessonId,
    passed,
    score: graded.score,
    correctCount: graded.correct,
    total: graded.total,
    perQuestion: graded.perQuestion,
  };
}

module.exports = {
  generateConceptQuizForAgent,
  submitConceptQuizSession,
  buildConceptSourceText,
};
