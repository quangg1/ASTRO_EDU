const fetch = require('node-fetch');
const { runWithFallback } = require('../chatCompletion');
const { normalizeQuizList, newQuizQuestionId } = require('../../../shared/quizQuestion');
const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || '').trim();

function flattenSectionText(sections) {
  if (!Array.isArray(sections)) return '';
  const out = [];
  for (const sec of sections) {
    if (!sec || typeof sec !== 'object') continue;
    const t = [];
    if (sec.title) t.push(String(sec.title));
    if (sec.subtitle) t.push(String(sec.subtitle));
    if (sec.text) t.push(String(sec.text));
    if (sec.content) t.push(typeof sec.content === 'string' ? sec.content : JSON.stringify(sec.content));
    if (Array.isArray(sec.items)) t.push(sec.items.map((x) => String(x || '')).join('\n'));
    out.push(t.join('\n'));
  }
  return out.join('\n\n').trim();
}

function normalizeGeneratedRecallQuiz(items, lessonId) {
  return normalizeQuizList(items, lessonId, { minCount: 0, maxCount: 5 });
}

function fallbackQuizFromSource(source, lessonId, minQuestions = 3, targetQuestions = 4) {
  const sents = String(source || '')
    .replace(/\n+/g, ' ')
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);
  const facts = sents.length ? sents : [String(source || '').slice(0, 220).trim() || 'Nội dung chính của bài học.'];
  const total = Math.max(minQuestions, Math.min(5, targetQuestions));
  const out = [];
  for (let i = 0; i < total; i += 1) {
    const fact = String(facts[i % facts.length] || '').slice(0, 180);
    out.push({
      id: newQuizQuestionId(`rq-${String(lessonId || 'lesson')}-fb-${i}`),
      type: 'mcq',
      question: `Theo bài học, nhận định nào đúng nhất (${i + 1})?`,
      options: [
        { text: fact },
        { text: 'Bài học kết luận điều ngược lại hoàn toàn với nội dung trên.' },
        { text: 'Bài học không đề cập và phủ nhận chủ đề này.' },
        { text: 'Đây chỉ là nhận định ngoài lề, không liên quan bài học.' },
      ],
      answer: 0,
      optionExplanations: [
        'Đúng: phương án này bám sát nội dung bài học.',
        'Sai: phương án này mâu thuẫn với nội dung bài học.',
        'Sai: bài học không khẳng định như phương án này.',
        'Sai: đây là diễn giải không đúng trọng tâm bài học.',
      ],
    });
  }
  return out;
}

async function generateRecallQuizFromLesson(lesson) {
  const lessonId = String(lesson?.id || '').trim();
  const titleVi = String(lesson?.titleVi || '').trim();
  const title = String(lesson?.title || '').trim();
  const source =
    flattenSectionText(lesson?.sections) ||
    String(lesson?.body || '').trim() ||
    `${titleVi}\n${title}`;

  if (!source.trim()) {
    return { ok: false, status: 400, code: 'LESSON_CONTENT_EMPTY', error: 'Bài học không có nội dung để sinh quiz' };
  }

  if (AI_SERVICE_URL) {
    try {
      const r = await fetch(`${AI_SERVICE_URL.replace(/\/$/, '')}/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(data?.recallQuiz)) {
        const remoteQuiz = normalizeGeneratedRecallQuiz(data.recallQuiz, lessonId);
        if (remoteQuiz.length >= 3) {
          return { ok: true, recallQuiz: remoteQuiz, provider: 'ai_service' };
        }
      }
    } catch {
      // fallback local AI path below
    }
  }

  const systemPrompt =
    'Bạn là giáo viên thiên văn học. Tạo quiz kiểm tra hiểu bài bằng tiếng Việt, rõ ràng, không đánh đố, chỉ bám nội dung bài. Trả JSON hợp lệ.';
  const userPrompt = [
    'Tạo 5 câu trắc nghiệm một đáp án đúng (type: mcq).',
    'Mỗi câu có đúng 4 options (mảng object { "text": "..." }).',
    'Không dùng phương án "Tất cả đều đúng/đều sai".',
    'Phân bố vị trí answer (chỉ số 0–3) ngẫu nhiên.',
    'Đầu ra bắt buộc:',
    '{"quiz":[{"id":"","type":"mcq","question":"...","options":[{"text":"..."},{"text":"..."},{"text":"..."},{"text":"..."}],"answer":0,"optionExplanations":["...","...","...","..."]}]}',
    '',
    `lesson_id: ${lessonId || 'unknown'}`,
    `lesson_title_vi: ${titleVi}`,
    `lesson_title_en: ${title}`,
    'lesson_content:',
    source.slice(0, 14000),
  ].join('\n');

  const { payload, providerErrors } = await runWithFallback(systemPrompt, userPrompt, 'object');
  const quiz = normalizeGeneratedRecallQuiz(payload?.quiz || [], lessonId);
  if (quiz.length < 3) {
    const fallbackQuiz = fallbackQuizFromSource(source, lessonId, 3, 4);
    if (fallbackQuiz.length >= 3) {
      return { ok: true, recallQuiz: fallbackQuiz, provider: 'api_template_fallback' };
    }
    return {
      ok: false,
      status: 422,
      code: 'QUIZ_GENERATION_FAILED',
      error: 'LLM không tạo đủ câu hợp lệ (>=3)',
      details: providerErrors,
    };
  }

  return { ok: true, recallQuiz: quiz, provider: 'api_fallback' };
}

module.exports = {
  generateRecallQuizFromLesson,
};
