const fetch = require('node-fetch');
const { runWithFallback } = require('../../../lib/ai/chatCompletion');
const { normalizeQuizList, newQuizQuestionId } = require('../../../shared/quizQuestion');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || '').trim();

function fallbackExploreQuiz(context, entityId) {
  const label = String(context.displayName || entityId).trim();
  const blurb = String(context.museumBlurbVi || '').trim();
  const fact = blurb.split(/[.!?]/)[0]?.trim().slice(0, 140) || `${label} là thiên thể trong bảo tàng Explore.`;
  const group = String(context.groupLabelVi || 'Hành tinh · vệ tinh');
  const out = [
    {
      id: newQuizQuestionId(`explore-ai-fb-${entityId}-0`),
      type: 'mcq',
      question: `Khi khám phá ${label} trên Explore, nhận định nào phù hợp nhất?`,
      options: [{ text: fact }, { text: `${label} không thuộc hệ Mặt Trời.` }, { text: `${label} là hố đen.` }, { text: `${label} chỉ xuất hiện trong khóa học trả phí.` }],
      answer: 0,
    },
    {
      id: newQuizQuestionId(`explore-ai-fb-${entityId}-1`),
      type: 'mcq',
      question: `${label} thuộc nhóm nào trong catalog Explore?`,
      options: [{ text: group }, { text: 'Thiên hà xa xôi' }, { text: 'Vật chất tối' }, { text: 'Vệ tinh nhân tạo của Trái Đất' }],
      answer: 0,
    },
  ];
  return normalizeQuizList(out, entityId, { minCount: 2, maxCount: 6 });
}

/**
 * Sinh pool câu Explore (mức khám phá, không chuyên sâu LP). Chỉ gọi từ batch script / editor — không hot path user.
 */
async function generateExploreContextualQuizFromContext(context) {
  const entityId = String(context?.entityId || '').trim();
  if (!entityId) {
    return { ok: false, status: 400, code: 'INVALID_ENTITY', error: 'Thiếu entityId' };
  }

  const displayName = String(context.displayName || entityId).trim();
  const blurb = String(context.museumBlurbVi || '').slice(0, 2000);
  const groupLabelVi = String(context.groupLabelVi || '').trim();
  const hostPlanet = String(context.linkedPlanetName || '').trim();
  const periodDays = context.periodDays != null ? String(context.periodDays) : '';
  const conceptTitles = Array.isArray(context.conceptTitles) ? context.conceptTitles.slice(0, 6) : [];

  if (AI_SERVICE_URL) {
    try {
      const r = await fetch(`${AI_SERVICE_URL.replace(/\/$/, '')}/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'explore_contextual',
          entityId,
          displayName,
          museumBlurbVi: blurb,
          groupLabelVi,
          linkedPlanetName: hostPlanet,
          periodDays,
          conceptTitles,
          targetCount: 6,
        }),
      });
      const data = await r.json().catch(() => ({}));
      const raw = data?.recallQuiz || data?.quiz || data?.questions || [];
      if (r.ok && Array.isArray(raw)) {
        const quiz = normalizeQuizList(raw, entityId, { minCount: 4, maxCount: 8 });
        if (quiz.length >= 4) {
          return { ok: true, questions: quiz, provider: 'ai_service' };
        }
      }
    } catch {
      // fallback below
    }
  }

  const systemPrompt =
    'Bạn tạo quiz khám phá Explore (thiên văn) bằng tiếng Việt — mức độ nhẹ, bám metadata thiên thể, KHÔNG dùng kiến thức chuyên sâu đại học. Trả JSON hợp lệ.';
  const userPrompt = [
    'Tạo 6 câu trắc nghiệm MCQ (4 options, 1 đáp án đúng).',
    'Chủ đề: thiên thể user vừa xem trong scene 3D Explore.',
    'Tránh câu đánh đố, tránh số liệu không có trong context.',
    'JSON: {"quiz":[{"id":"","type":"mcq","question":"...","options":[{"text":"..."}x4],"answer":0}]}',
    '',
    `entity_id: ${entityId}`,
    `display_name: ${displayName}`,
    `group_vi: ${groupLabelVi}`,
    `host_planet: ${hostPlanet || '(none)'}`,
    `orbit_period_days: ${periodDays || '(unknown)'}`,
    `concept_titles: ${conceptTitles.join(', ') || '(none)'}`,
    'museum_blurb_vi:',
    blurb || '(empty)',
  ].join('\n');

  const { payload, providerErrors } = await runWithFallback(systemPrompt, userPrompt, 'object');
  const quiz = normalizeQuizList(payload?.quiz || [], entityId, { minCount: 0, maxCount: 8 });
  if (quiz.length >= 4) {
    return { ok: true, questions: quiz, provider: 'api_fallback' };
  }

  const fb = fallbackExploreQuiz(context, entityId);
  if (fb.length >= 2) {
    return { ok: true, questions: fb, provider: 'template_fallback' };
  }

  return {
    ok: false,
    status: 422,
    code: 'EXPLORE_QUIZ_GENERATION_FAILED',
    error: 'Không sinh đủ câu Explore hợp lệ',
    details: providerErrors,
  };
}

module.exports = { generateExploreContextualQuizFromContext };
