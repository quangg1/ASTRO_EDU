const crypto = require('crypto');
const { slugify } = require('../../../shared/text/slugify');
const {
  cohortRepository,
  cohortEnrollmentRepository,
} = require('../repositories');
const { normalizeCohortPricingFields } = require('../lib/cohortPricing');
const { publicCohortCard } = require('./cohortEnrollmentService');
const { normalizeModuleWeekMap } = require('./moduleDeliveryWeek');
const presenter = require('../presenters/cohortPresenter');

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const INVITE_CODE_BYTES = 4;

function generateInviteCode() {
  return crypto.randomBytes(INVITE_CODE_BYTES).toString('hex').toUpperCase();
}

/** Cohorts the learner belongs to, restricted to one course. */
async function listLearnerCohorts({ userId, course }) {
  const enrollments = await cohortEnrollmentRepository.listForUser(userId);
  if (!enrollments.length) return [];

  const enrollmentByCohort = new Map(enrollments.map((e) => [String(e.cohortId), e]));
  const cohorts = await cohortRepository.listByIdsInCourse(
    enrollments.map((e) => e.cohortId),
    course._id,
  );

  return cohorts.map((cohort) =>
    presenter.learnerCohortCard(cohort, enrollmentByCohort.get(String(cohort._id))),
  );
}

/** Public catalog: open cohorts still inside their enrollment window. */
async function listEnrollableCohorts({ course, now = new Date() }) {
  const cohorts = await cohortRepository.listOpenForCourse(course._id);
  return cohorts.map((cohort) => publicCohortCard(cohort, course, now)).filter((c) => c.enrollmentOpen);
}

/** Teacher view: every cohort including drafts, with member counts. */
async function listManagedCohorts({ course }) {
  const cohorts = await cohortRepository.listAllForCourse(course._id);
  const counts = await cohortEnrollmentRepository.countByCohortIds(cohorts.map((c) => c._id));
  return cohorts.map((cohort) => presenter.manageCohortRow(cohort, counts[String(cohort._id)] || 0));
}

async function createCohort({ course, actor, input }) {
  const title = input.title || `${course.title} — Lớp mới`;
  const baseSlug = slugify(input.slug || title) || `cohort-${Date.now()}`;
  const slug = await cohortRepository.reserveUniqueSlug(course._id, baseSlug);

  const cohort = await cohortRepository.create({
    courseId: course._id,
    title,
    slug,
    timezone: input.timezone || DEFAULT_TIMEZONE,
    status: input.status,
    startAt: input.startAt,
    endAt: input.endAt,
    inviteCode: generateInviteCode(),
    teacherId: actor.role === 'teacher' ? actor.id : input.teacherId || null,
    price: input.price,
    currency: input.currency,
  });

  normalizeCohortPricingFields(cohort, course);
  await cohort.save();
  return cohort;
}

/**
 * Partial update. Only keys present in `input` are touched, so clients can
 * clear `startAt`/`price` with `null` without wiping untouched fields.
 */
async function updateCohort({ course, cohort, input }) {
  const assignIfPresent = (key, value = input[key]) => {
    if (value !== undefined) cohort[key] = value;
  };

  assignIfPresent('status');
  assignIfPresent('title');
  assignIfPresent('timezone');
  assignIfPresent('startAt');
  assignIfPresent('endAt');
  assignIfPresent('price');
  assignIfPresent('currency');

  if (input.moduleWeekMap !== undefined) {
    cohort.moduleWeekMap = normalizeModuleWeekMap(input.moduleWeekMap);
    cohort.markModified('moduleWeekMap');
  }

  normalizeCohortPricingFields(cohort, course);
  await cohort.save();
  return cohort;
}

module.exports = {
  listLearnerCohorts,
  listEnrollableCohorts,
  listManagedCohorts,
  createCohort,
  updateCohort,
};
