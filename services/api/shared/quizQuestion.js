const mongoose = require('mongoose');

const QUIZ_TYPES = ['mcq', 'true_false', 'fill'];

function newQuizQuestionId(prefix = 'qq') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeQuizQuestion(raw, lessonId, idx = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const question = String(raw.question || '').trim();
  if (!question) return null;

  const typeRaw = String(raw.type || 'mcq');
  const type = QUIZ_TYPES.includes(typeRaw) ? typeRaw : 'mcq';

  let options = [];
  if (Array.isArray(raw.options)) {
    options = raw.options.map((x) => {
      if (x && typeof x === 'object' && x.text != null) return { text: String(x.text) };
      return { text: String(x ?? '') };
    });
  }

  const pairs = options
    .map((opt, orig) => ({ text: String(opt.text || '').trim(), orig }))
    .filter((p) => p.text);
  if (pairs.length < 3) return null;

  const answerRaw = raw.answer;
  const answerNum =
    typeof answerRaw === 'number' && Number.isFinite(answerRaw)
      ? answerRaw
      : typeof answerRaw === 'string' && answerRaw !== ''
        ? Number(answerRaw)
        : 0;
  const mappedIdx = pairs.findIndex((p) => p.orig === (Number.isFinite(answerNum) ? answerNum : 0));
  const answerIndex = mappedIdx >= 0 ? mappedIdx : 0;

  const trimmedOptions = pairs.map((p) => ({ text: p.text }));
  const rawExpl = Array.isArray(raw.optionExplanations)
    ? raw.optionExplanations.map((e) => String(e || ''))
    : [];
  const optionExplanations = trimmedOptions.map((_, i) => {
    const orig = pairs[i].orig;
    const r = String(rawExpl[orig] ?? rawExpl[i] ?? '').trim();
    return (
      r ||
      (i === answerIndex
        ? 'Đây là đáp án đúng theo nội dung bài học.'
        : 'Phương án này chưa khớp với nội dung bài học.')
    );
  });

  return {
    id: String(raw.id || '').trim() || newQuizQuestionId(`q-${lessonId || 'lesson'}-${idx}`),
    type,
    question,
    options: trimmedOptions,
    answer: answerIndex,
    explanation: raw.explanation != null ? String(raw.explanation) : undefined,
    optionExplanations: rawExpl.length ? optionExplanations : undefined,
  };
}

function normalizeQuizList(raw, lessonId, opts = {}) {
  if (!Array.isArray(raw)) return [];
  const max = opts.maxCount ?? 20;
  const min = opts.minCount ?? 0;
  const out = [];
  for (let i = 0; i < Math.min(max, raw.length); i += 1) {
    const q = normalizeQuizQuestion(raw[i], lessonId, i);
    if (q) out.push(q);
  }
  return out.length >= min ? out : [];
}

const quizQuestionMongooseSchema = {
  id: { type: String, default: '' },
  type: { type: String, enum: QUIZ_TYPES, default: 'mcq' },
  question: { type: String, required: true },
  options: [{ text: { type: String, default: '' } }],
  answer: { type: mongoose.Schema.Types.Mixed, required: true },
  explanation: { type: String, default: '' },
  optionExplanations: [{ type: String }],
};

module.exports = {
  QUIZ_TYPES,
  newQuizQuestionId,
  normalizeQuizQuestion,
  normalizeQuizList,
  quizQuestionMongooseSchema,
};
