const Enrollment = require('../../courses/models/Enrollment');
const Course = require('../../courses/models/Course');

/**
 * @typedef {'guest'|'lp_free'|'course_trial'|'course_enrolled'|'teacher'|'trial_expired'} AgentTier
 */

/**
 * @param {{
 *   userId?: string|null,
 *   userRole?: string,
 *   sessionContext?: Record<string, unknown>|null,
 * }} input
 * @returns {Promise<{ tier: AgentTier, courseSlug?: string, courseId?: import('mongoose').Types.ObjectId }>}
 */
async function resolveAgentTier({ userId, userRole, sessionContext }) {
  const surface = sessionContext?.surface;
  const courseSlug =
    typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug : undefined;

  if (userId && userRole === 'teacher' && surface === 'studio') {
    return { tier: 'teacher', courseSlug };
  }

  if (courseSlug && userId) {
    const course = await Course.findOne({ slug: courseSlug }).select('_id slug').lean();
    if (course) {
      const enrollment = await Enrollment.findOne({ userId, courseId: course._id }).lean();
      if (enrollment) {
        if (enrollment.status === 'trial') {
          const exp = enrollment.trialExpiresAt ? new Date(enrollment.trialExpiresAt) : null;
          if (exp && exp < new Date()) {
            return { tier: 'trial_expired', courseSlug, courseId: course._id };
          }
          return { tier: 'course_trial', courseSlug, courseId: course._id };
        }
        return { tier: 'course_enrolled', courseSlug, courseId: course._id };
      }
    }
  }

  if (userId) {
    return { tier: 'lp_free', courseSlug };
  }

  return { tier: 'guest', courseSlug };
}

module.exports = { resolveAgentTier };
