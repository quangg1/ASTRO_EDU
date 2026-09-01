const { enrollmentRepository } = require('../repositories');
const {
  loadEnrollableCohort,
  placeStudentInCohort,
  cohortEnrollmentEmailMessage,
} = require('./cohortEnrollmentService');

/**
 * Self-service cohort registration.
 *
 * "Payment required" is a normal outcome, not a failure: the caller gets a
 * discriminated result (`status: 'payment_required' | 'enrolled'`) and decides
 * how to render it. Modelling it as an exception would force the transport
 * layer to reconstruct a rich quote out of an error object.
 */
async function registerLearnerInCohort({ userId, course, cohortId }) {
  const cohort = await loadEnrollableCohort({ courseId: course._id, cohortId });

  // Lazy require: cohort checkout pricing pulls in the payment context, which
  // reads back from courses — resolving it at call time keeps the cycle broken.
  const { resolveCohortCheckoutPrice } = require('../lib/cohortCheckoutPricing');
  const pricing = await resolveCohortCheckoutPrice({ userId, cohort, course });

  if (pricing.requiresPayment) {
    return { status: 'payment_required', cohort, pricing };
  }

  await enrollmentRepository.ensureForCourse(userId, course);
  const placement = await placeStudentInCohort({ userId, course, cohort });

  return {
    status: 'enrolled',
    cohort,
    placement: {
      cohortId: placement.cohortId,
      slug: placement.cohortSlug,
      title: cohort.title,
      inviteEmailSent: placement.emailSent,
      message: cohortEnrollmentEmailMessage(placement),
    },
  };
}

module.exports = { registerLearnerInCohort };
