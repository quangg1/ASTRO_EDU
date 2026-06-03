const {
  TOPIC_EXPLORE_ENTITY,
  INTENT_FORUM_SLUG,
} = require('../constants/onboardingOptions');

const DEPTH_BY_EXPERIENCE = Object.freeze({
  beginner: 'beginner',
  some: 'explorer',
  advanced: 'researcher',
});

function experienceToDepth(experienceLevel) {
  return DEPTH_BY_EXPERIENCE[experienceLevel] || 'beginner';
}

function appendQuery(path, params) {
  const [base, existingQs] = String(path || '/dashboard').split('?');
  const sp = new URLSearchParams(existingQs || '');
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === '') continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

function cosmosFocusForTopic(primaryTopicId) {
  if (primaryTopicId === 'galaxies-nebulae') return 'search';
  if (primaryTopicId === 'stars-constellations') return 'mw';
  return 'wide';
}

/**
 * B1 → đích · B2 → topics/focus · B3 → depth/tour/sort
 */
function buildOnboardingPrimaryHref(input) {
  const intent = input.primaryIntent || 'mixed';
  const topicIds = Array.isArray(input.topicIds) ? input.topicIds : [];
  const primaryTopicId = input.primaryTopicId || topicIds[0] || 'astrophysics';
  const topics = topicIds.join(',');
  const depth = experienceToDepth(input.experienceLevel);
  const tour = input.experienceLevel === 'advanced' ? '0' : '1';
  const baseFrom = { from: 'onboarding' };

  switch (intent) {
    case 'learn_path':
      return appendQuery(`/topics/${encodeURIComponent(primaryTopicId)}`, {
        ...baseFrom,
        topics,
        depth,
      });
    case 'explore_3d': {
      if (primaryTopicId === 'stars-constellations') {
        return appendQuery('/explore', {
          ...baseFrom,
          view: 'sky',
          target: 'constellation-orion',
          tour,
          topics,
        });
      }
      const entity = TOPIC_EXPLORE_ENTITY[primaryTopicId] || 'planet-earth';
      return appendQuery('/explore', {
        ...baseFrom,
        view: 'solar',
        entity,
        history: '1',
        tour,
        topics,
      });
    }
    case 'stargazing':
      return appendQuery('/cosmos', {
        ...baseFrom,
        topics,
        tour,
        focus: cosmosFocusForTopic(primaryTopicId),
      });
    case 'community': {
      const slug = INTENT_FORUM_SLUG.community || 'hoi-dap-hoc-tap';
      return appendQuery(`/community/${slug}`, {
        ...baseFrom,
        topics,
        sort: input.experienceLevel === 'advanced' ? 'hot' : 'newest',
        pin: input.experienceLevel === 'beginner' ? 'newbie' : '',
      });
    }
    case 'mixed':
      return appendQuery('/dashboard', {
        ...baseFrom,
        welcome: '1',
        topics,
        depth,
      });
    default:
      return appendQuery('/dashboard', baseFrom);
  }
}

function buildStarterLessonHref(starter, depth) {
  if (!starter?.moduleId || !starter?.nodeId || !starter?.lessonId) return null;
  return appendQuery(
    `/tutorial/${encodeURIComponent(starter.moduleId)}/${encodeURIComponent(starter.nodeId)}/${encodeURIComponent(starter.lessonId)}`,
    { from: 'onboarding', depth: depth || 'beginner' },
  );
}

function buildExploreEntityHref(primaryTopicId, extra = {}) {
  if (primaryTopicId === 'stars-constellations') {
    return appendQuery('/explore', {
      view: 'sky',
      target: 'constellation-orion',
      ...extra,
    });
  }
  const entity = TOPIC_EXPLORE_ENTITY[primaryTopicId] || 'planet-earth';
  return appendQuery('/explore', {
    view: 'solar',
    entity,
    history: '1',
    ...extra,
  });
}

module.exports = {
  experienceToDepth,
  appendQuery,
  buildOnboardingPrimaryHref,
  buildStarterLessonHref,
  buildExploreEntityHref,
  cosmosFocusForTopic,
};
