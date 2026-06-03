/**
 * Quiz template La bàn chòm sao — port từ client buildSkyContextualQuiz.ts
 */
const { newQuizQuestionId } = require('../../../shared/quizQuestion');

const IAU_WRONG = ['Ori', 'Leo', 'Peg', 'And', 'Sco', 'UMa', 'Lyr', 'Cyg', 'Aql', 'CMa'];

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, seed) {
  const out = [...items];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistinct(items, count, seed, exclude) {
  const ex = exclude || new Set();
  const pool = items.filter((x) => !ex.has(x));
  return shuffle(pool, seed).slice(0, count);
}

function buildMcq(question, correct, wrongs, seed) {
  const c = String(correct || '').trim();
  if (!c) return null;
  const distractors = pickDistinct(
    wrongs.map((w) => String(w || '').trim()).filter((w) => w && w !== c),
    3,
    seed,
  );
  if (distractors.length < 2) return null;
  const options = shuffle([c, ...distractors].slice(0, 4), seed + 17);
  const answerIndex = options.indexOf(c);
  if (answerIndex < 0) return null;
  return {
    id: newQuizQuestionId('sky_tpl'),
    type: 'mcq',
    question,
    options: options.map((text) => ({ text })),
    answer: answerIndex,
  };
}

function buildSkyConstellationQuizTemplate({ entityId, entity, peerEntities, concepts, limit = 8 }) {
  const label = String(entity.nameVi || '')
    .replace(/^Chòm sao /, '')
    .trim();
  if (!label) return [];

  const seed = hashString(entityId);
  const candidates = [];
  const peerNames = (peerEntities || [])
    .map((e) => String(e.nameVi || '').replace(/^Chòm sao /, '').trim())
    .filter(Boolean);

  const nameQ = buildMcq(
    'Trên La bàn chòm sao, bạn đang xem chòm nào?',
    label,
    pickDistinct(peerNames, 6, seed + 1),
    seed + 2,
  );
  if (nameQ) candidates.push(nameQ);

  if (entity.iauCode) {
    const iauQ = buildMcq(
      `Mã IAU ba chữ của chòm ${label} là gì?`,
      entity.iauCode,
      pickDistinct(IAU_WRONG.filter((c) => c !== entity.iauCode), 4, seed + 3),
      seed + 4,
    );
    if (iauQ) candidates.push(iauQ);
  }

  if (entity.nameEn) {
    const enQ = buildMcq(
      'Tên tiếng Anh (IAU) của chòm này là gì?',
      entity.nameEn,
      pickDistinct(
        (peerEntities || []).map((e) => e.nameEn).filter((n) => n && n !== entity.nameEn),
        4,
        seed + 5,
      ),
      seed + 6,
    );
    if (enQ) candidates.push(enQ);
  }

  const concept = (concepts || []).find((c) => String(c.title || '').trim());
  if (concept?.title) {
    const peerTitles = pickDistinct(
      (concepts || []).map((c) => String(c.title || '').trim()).filter((t) => t && t !== concept.title),
      3,
      seed + 9,
    );
    const conceptQ = buildMcq(
      `Khái niệm nào gắn với chòm ${label} trên lộ trình học?`,
      concept.title,
      peerTitles.length >= 2 ? peerTitles : ['Quỹ đạo', 'Vành đai Sao', 'Sao lùn'],
      seed + 10,
    );
    if (conceptQ) candidates.push(conceptQ);
  }

  return shuffle(candidates, seed + 99).slice(0, limit);
}

module.exports = { buildSkyConstellationQuizTemplate };
