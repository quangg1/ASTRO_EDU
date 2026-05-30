const STRATEGIES = ['self_paced', 'instructor_led', 'hybrid'];

function resolveDistributionStrategy(course) {
  const raw = course?.distributionStrategy;
  if (STRATEGIES.includes(raw)) return raw;
  return course?.catalogEnabled === false ? 'instructor_led' : 'hybrid';
}

function applyDistributionStrategy(course, strategy) {
  if (!STRATEGIES.includes(strategy)) return resolveDistributionStrategy(course);
  course.distributionStrategy = strategy;
  course.catalogEnabled = strategy !== 'instructor_led';
  return strategy;
}

function catalogEnabledForStrategy(strategy) {
  return strategy !== 'instructor_led';
}

function cohortsUiEnabledForStrategy(strategy) {
  return strategy !== 'self_paced';
}

module.exports = {
  STRATEGIES,
  resolveDistributionStrategy,
  applyDistributionStrategy,
  catalogEnabledForStrategy,
  cohortsUiEnabledForStrategy,
};
