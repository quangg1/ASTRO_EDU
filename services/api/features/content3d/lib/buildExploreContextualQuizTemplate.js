/**
 * Template MCQ cho Explore — port từ client buildExploreContextualQuiz.ts (không AI).
 */
const { newQuizQuestionId } = require('../../../shared/quizQuestion');

const GROUP_LABEL_VI = {
  planets_moons: 'Hành tinh · vệ tinh',
  dwarf_asteroids: 'Hành tinh lùn · tiểu hành tinh',
  comets: 'Sao chổi',
  spacecraft: 'Tàu vũ trụ',
};

const SOLAR_PLANET_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

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

function formatDays(n) {
  if (n >= 100) return `${Math.round(n).toLocaleString('vi-VN')} ngày`;
  if (n >= 10) return `${n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ngày`;
  return `${n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ngày`;
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
    id: newQuizQuestionId('explore_tpl'),
    type: 'mcq',
    question,
    options: options.map((text) => ({ text })),
    answer: answerIndex,
  };
}

function orbitPeriodDays(orbit) {
  const raw = Number(orbit?.orbitalElements?.periodDays ?? orbit?.periodDays ?? orbit?.period ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

function isSatelliteEntity(entityId, item) {
  if (String(entityId).startsWith('moon-')) return true;
  if (item?.linkedPlanetName) return true;
  return Boolean(String(item?.id || '').includes('moon-'));
}

function buildExploreContextualQuizTemplate(args) {
  const { entityId, item, orbit, concepts, catalog, limit = 8 } = args;
  const label = String(item?.displayName || item?.name || entityId).trim();
  if (!label) return [];

  const seed = hashString(entityId);
  const candidates = [];

  const peerLabels = (catalog || [])
    .filter((row) => row.id !== entityId)
    .map((row) => String(row.displayName || row.name || '').trim())
    .filter(Boolean);

  const nameQ = buildMcq(
    'Trong scene Explore, bạn đang quan sát thiên thể nào?',
    label,
    pickDistinct(peerLabels, 6, seed + 1),
    seed + 2,
  );
  if (nameQ) candidates.push(nameQ);

  if (item?.group && GROUP_LABEL_VI[item.group]) {
    const groupLabels = Object.values(GROUP_LABEL_VI);
    const correct = GROUP_LABEL_VI[item.group];
    const groupQ = buildMcq(
      `${label} thuộc nhóm nào trong bảo tàng vũ trụ?`,
      correct,
      groupLabels.filter((g) => g !== correct),
      seed + 3,
    );
    if (groupQ) candidates.push(groupQ);
  }

  const hostPlanet = String(item?.linkedPlanetName || orbit?.orbitAround || '').trim();
  if (hostPlanet && isSatelliteEntity(entityId, item)) {
    const hostQ = buildMcq(
      `${label} quay quanh hành tinh nào?`,
      hostPlanet,
      pickDistinct(SOLAR_PLANET_NAMES, 5, seed + 4, new Set([hostPlanet])),
      seed + 5,
    );
    if (hostQ) candidates.push(hostQ);
  }

  const concept = (concepts || []).find((c) => String(c.title || '').trim());
  if (concept) {
    const fallbackWrongs = ['Quỹ đạo', 'Khí quyển', 'Sự sống', 'Bụi sao', 'Hố va chạm', 'Từ trường'];
    const peerConceptTitles = pickDistinct(
      (concepts || []).map((c) => String(c.title || '').trim()).filter((t) => t && t !== concept.title),
      3,
      seed + 6,
    );
    const wrongConcepts =
      peerConceptTitles.length >= 2
        ? peerConceptTitles
        : pickDistinct(
            fallbackWrongs.filter((t) => t !== concept.title),
            3,
            seed + 61,
          );
    const conceptQ = buildMcq(
      `Khái niệm nào được gắn với ${label} trên lộ trình học?`,
      concept.title,
      wrongConcepts,
      seed + 7,
    );
    if (conceptQ) candidates.push(conceptQ);
  }

  const period = orbitPeriodDays(orbit);
  if (period) {
    const correct = formatDays(period);
    const wrongNums = [period * 0.4, period * 1.6, period * 2.5, period + 88, Math.max(period * 0.15, 1)]
      .filter((n) => Number.isFinite(n) && n > 0 && Math.abs(n - period) / period > 0.12)
      .map(formatDays);
    const orbitQ = buildMcq(
      `Chu kỳ quỹ đạo của ${label} xấp xỉ bao nhiêu?`,
      correct,
      wrongNums,
      seed + 8,
    );
    if (orbitQ) candidates.push(orbitQ);
  }

  return shuffle(candidates, seed + 99).slice(0, limit);
}

module.exports = { buildExploreContextualQuizTemplate };
