const { courseRepository } = require('../repositories');
const { AppError } = require('../../../shared/errors');
const { canEditCourse } = require('../../../shared/jwtAuth');
const { slugify } = require('../../../shared/text/slugify');
const { assertActiveTeacher } = require('../../auth/services/userDirectoryService');
const { normalizeCoursePricingFields } = require('../lib/coursePricing');
const { normalizeCourseCohortPricingFields } = require('../lib/cohortPricing');
const { applyDistributionStrategy } = require('../lib/distributionStrategy');
const { normalizeModules, normalizeLessons } = require('../lib/courseContentNormalizer');
const { ensureStaffEnrollment } = require('./courseContentSecurity');

const SLUG_MAX_LENGTH = 80;

async function createCourse({ actor, input }) {
  const slug = slugify(input.slug || input.title, SLUG_MAX_LENGTH) || `course-${Date.now()}`;
  if (await courseRepository.slugExists(slug)) {
    throw new AppError(409, 'SLUG_TAKEN', 'Slug đã tồn tại. Thử tiêu đề hoặc slug khác.', { slug });
  }

  const course = await courseRepository.create({
    title: input.title,
    slug,
    description: '',
    level: 'beginner',
    published: false,
    modules: [],
    lessons: [],
    teacherId: actor.role === 'teacher' ? actor.id : null,
  });

  await ensureStaffEnrollment(course.toObject(), { userId: actor.id, userRole: actor.role });
  return course;
}

/**
 * Read-only editor load. Ownership is *not* claimed here — that only happens on
 * a mutation, so opening a course in Studio can never silently reassign it.
 */
async function getEditorCourse({ slug, actor }) {
  const course = await courseRepository.findBySlug(slug);
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');
  if (actor.role === 'teacher' && !canEditCourse(course, actor)) {
    throw AppError.forbidden('Không có quyền sửa khóa học này');
  }
  return course;
}

/** An unassigned course is claimed by the first teacher who saves it. */
async function resolveEditableCourseDoc({ slug, actor }) {
  const course = await courseRepository.findDocBySlug(slug);
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');

  if (actor.role === 'teacher') {
    if (!course.teacherId) course.teacherId = actor.id;
    else if (!canEditCourse(course, actor)) {
      throw AppError.forbidden('Không có quyền sửa khóa học này');
    }
  }
  return course;
}

async function applyTeacherAssignment(course, teacherId) {
  if (teacherId === undefined) return;
  if (teacherId === null || teacherId === '') {
    course.teacherId = null;
    return;
  }
  const id = String(teacherId).trim();
  await assertActiveTeacher(id);
  course.teacherId = id;
}

/**
 * Catalog visibility can be expressed either as an explicit distribution
 * strategy or as the legacy `catalogEnabled` toggle; the strategy wins.
 */
function applyCatalogVisibility(course, { distributionStrategy, catalogEnabled }) {
  if (distributionStrategy) {
    applyDistributionStrategy(course, distributionStrategy);
    return;
  }
  if (catalogEnabled === undefined) return;
  course.catalogEnabled = catalogEnabled;
  course.distributionStrategy = catalogEnabled === false ? 'instructor_led' : 'self_paced';
}

async function saveEditorCourse({ slug, actor, input }) {
  const course = await resolveEditableCourseDoc({ slug, actor });
  if (actor.role === 'admin') await applyTeacherAssignment(course, input.teacherId);

  const assign = (field) => {
    if (input[field] !== undefined) course[field] = input[field];
  };

  assign('title');
  assign('description');
  assign('thumbnail');
  assign('level');
  assign('durationWeeks');
  assign('published');
  assign('price');
  assign('currency');
  assign('isPaid');
  assign('cohortPrice');
  assign('cohortCurrency');
  assign('crossSellTutorialHref');
  assign('crossSellTutorialLabelVi');
  assign('crossSellTutorialBodyVi');

  applyCatalogVisibility(course, input);
  normalizeCoursePricingFields(course);
  normalizeCourseCohortPricingFields(course);

  if (input.modules) course.modules = normalizeModules(input.modules);
  if (input.lessons) course.lessons = normalizeLessons(input.lessons);

  await course.save();
  await ensureStaffEnrollment(course.toObject(), { userId: actor.id, userRole: actor.role });
  return course;
}

module.exports = { createCourse, getEditorCourse, saveEditorCourse };
