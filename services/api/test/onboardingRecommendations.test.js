const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  pickStarterLesson,
  buildOnboardingRecommendations,
} = require('../features/onboarding/services/onboardingRecommendations');
const { buildOnboardingPrimaryHref } = require('../features/onboarding/services/onboardingRedirectUrls');

const MOCK_MODULES = [
  {
    id: 'mod-1',
    nodes: [
      {
        id: 'node-a',
        topicWeights: [{ topicId: 'astrophysics', weight: 0.5 }],
        depths: {
          beginner: [{ id: 'lesson-1', titleVi: 'Bài vật lý cơ bản' }],
          explorer: [{ id: 'lesson-1e', titleVi: 'Bài vật lý cơ chế' }],
        },
      },
      {
        id: 'node-b',
        topicWeights: [{ topicId: 'exoplanets', weight: 0.2 }],
        depths: {
          beginner: [{ id: 'lesson-x', titleVi: 'Bài exo' }],
        },
      },
    ],
  },
];

describe('onboardingRecommendations', () => {
  it('pickStarterLesson prefers higher topic weight', () => {
    const starter = pickStarterLesson(MOCK_MODULES, ['exoplanets', 'astrophysics']);
    assert.equal(starter.lessonId, 'lesson-1');
    assert.equal(starter.topicId, 'astrophysics');
  });

  it('pickStarterLesson respects preferred depth', () => {
    const starter = pickStarterLesson(MOCK_MODULES, ['astrophysics'], 'explorer');
    assert.equal(starter.lessonId, 'lesson-1e');
    assert.equal(starter.depth, 'explorer');
  });

  it('buildOnboardingRecommendations learn_path opens topic landing', async () => {
    const built = await buildOnboardingRecommendations({
      primaryIntent: 'learn_path',
      topicIds: ['astrophysics'],
      experienceLevel: 'beginner',
      modules: MOCK_MODULES,
    });
    assert.equal(built.primaryTopicId, 'astrophysics');
    assert.match(built.primaryHref, /^\/topics\/astrophysics\?/);
    assert.match(built.primaryHref, /from=onboarding/);
    assert.match(built.primaryHref, /depth=beginner/);
    assert.ok(built.recommendations.some((r) => r.kind === 'lesson'));
  });

  it('buildOnboardingRecommendations explore_3d opens Explore with entity', async () => {
    const built = await buildOnboardingRecommendations({
      primaryIntent: 'explore_3d',
      topicIds: ['solar-system'],
      experienceLevel: 'beginner',
      modules: MOCK_MODULES,
    });
    assert.match(built.primaryHref, /^\/explore\?/);
    assert.match(built.primaryHref, /entity=planet-jupiter/);
    assert.match(built.primaryHref, /from=onboarding/);
    assert.match(built.primaryHref, /tour=1/);
  });

  it('buildOnboardingRecommendations stargazing opens cosmos map', async () => {
    const built = await buildOnboardingRecommendations({
      primaryIntent: 'stargazing',
      topicIds: ['galaxies-nebulae'],
      experienceLevel: 'some',
      modules: MOCK_MODULES,
    });
    assert.match(built.primaryHref, /^\/cosmos\?/);
    assert.match(built.primaryHref, /focus=search/);
    assert.match(built.primaryHref, /tour=1/);
  });

  it('buildOnboardingRecommendations mixed opens dashboard welcome', async () => {
    const built = await buildOnboardingRecommendations({
      primaryIntent: 'mixed',
      topicIds: ['astrophysics'],
      experienceLevel: 'advanced',
      modules: MOCK_MODULES,
    });
    assert.match(built.primaryHref, /^\/dashboard\?/);
    assert.match(built.primaryHref, /welcome=1/);
  });

  it('buildOnboardingPrimaryHref community uses forum slug', () => {
    const href = buildOnboardingPrimaryHref({
      primaryIntent: 'community',
      topicIds: ['telescopes'],
      experienceLevel: 'beginner',
      primaryTopicId: 'telescopes',
    });
    assert.match(href, /^\/community\/hoi-dap-hoc-tap\?/);
    assert.match(href, /pin=newbie/);
  });
});
