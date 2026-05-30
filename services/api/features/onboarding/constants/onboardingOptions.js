/** Chủ đề — khớp client/src/data/learningTopics.ts */
const VALID_TOPIC_IDS = Object.freeze([
  'solar-system',
  'stars-constellations',
  'exoplanets',
  'astrophysics',
  'space-exploration',
  'galaxies-nebulae',
  'stargazing',
  'telescopes',
]);

const ONBOARDING_INTENTS = Object.freeze([
  { id: 'learn_path', labelVi: 'Học có hệ thống qua lộ trình' },
  { id: 'explore_3d', labelVi: 'Khám phá vũ trụ 3D tương tác' },
  { id: 'stargazing', labelVi: 'Quan sát bầu trời & thiết bị' },
  { id: 'community', labelVi: 'Hỏi đáp & thảo luận cộng đồng' },
  { id: 'mixed', labelVi: 'Kết hợp nhiều cách học' },
]);

const EXPERIENCE_LEVELS = Object.freeze([
  { id: 'beginner', labelVi: 'Mới bắt đầu', preferredDepth: 'beginner' },
  { id: 'some', labelVi: 'Đã biết cơ bản', preferredDepth: 'explorer' },
  { id: 'advanced', labelVi: 'Muốn đi sâu', preferredDepth: 'researcher' },
]);

const MAX_TOPIC_PICKS = 3;

const TOPIC_EXPLORE_ENTITY = Object.freeze({
  'solar-system': 'planet-jupiter',
  'stars-constellations': 'planet-earth',
  exoplanets: 'planet-neptune',
  astrophysics: 'planet-earth',
  'space-exploration': 'planet-mars',
  'galaxies-nebulae': 'moon-io',
  stargazing: 'planet-earth',
  telescopes: 'planet-saturn',
});

const INTENT_FORUM_SLUG = Object.freeze({
  learn_path: 'hoi-dap-hoc-tap',
  explore_3d: 'du-an-showcase',
  stargazing: 'quan-sat-thiet-bi',
  community: 'hoi-dap-hoc-tap',
  mixed: 'thao-luan-thien-van',
});

module.exports = {
  VALID_TOPIC_IDS,
  ONBOARDING_INTENTS,
  EXPERIENCE_LEVELS,
  MAX_TOPIC_PICKS,
  TOPIC_EXPLORE_ENTITY,
  INTENT_FORUM_SLUG,
};
