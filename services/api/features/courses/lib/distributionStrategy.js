const STRATEGIES = ['self_paced', 'instructor_led'];

function resolveDistributionStrategy(course) {
  const raw = course?.distributionStrategy;
  if (raw === 'self_paced' || raw === 'instructor_led') return raw;
  /** Legacy hybrid → tự học catalog */
  if (raw === 'hybrid') return 'self_paced';
  return course?.catalogEnabled === false ? 'instructor_led' : 'self_paced';
}

function applyDistributionStrategy(course, strategy) {
  if (strategy === 'instructor_led') {
    course.distributionStrategy = 'instructor_led';
    course.catalogEnabled = false;
    return 'instructor_led';
  }
  course.distributionStrategy = 'self_paced';
  course.catalogEnabled = true;
  return 'self_paced';
}

function catalogEnabledForStrategy(strategy) {
  return resolveDistributionStrategy({ distributionStrategy: strategy }) !== 'instructor_led';
}

function cohortsUiEnabledForStrategy(strategy) {
  return resolveDistributionStrategy({ distributionStrategy: strategy }) === 'instructor_led';
}

module.exports = {
  STRATEGIES,
  resolveDistributionStrategy,
  applyDistributionStrategy,
  catalogEnabledForStrategy,
  cohortsUiEnabledForStrategy,
};
