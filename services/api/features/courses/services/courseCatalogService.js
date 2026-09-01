const { courseRepository, enrollmentRepository } = require('../repositories');
const { paidCoursesQuery, freeCoursesQuery } = require('../lib/coursePricing');
const { escapeRegex } = require('../../../shared/escapeRegex');
const presenter = require('../presenters/coursePresenter');

/**
 * Public catalog filter.
 *
 * The search term is regex-escaped: it used to be interpolated straight into
 * `new RegExp(q)`, which let a crafted query act as a ReDoS vector.
 */
function buildCatalogFilter({ q, level, pricing }) {
  const clauses = [{ published: true }, { catalogEnabled: { $ne: false } }];

  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    clauses.push({ $or: [{ title: pattern }, { description: pattern }] });
  }
  if (level) clauses.push({ level });
  if (pricing === 'free') clauses.push(freeCoursesQuery());
  if (pricing === 'paid') clauses.push(paidCoursesQuery());

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

async function listCatalog(filters) {
  const courses = await courseRepository.listCatalog(buildCatalogFilter(filters));
  return courses.map(presenter.catalogCard);
}

/** Teachers only see courses they own; admins see everything. */
async function listEditorCourses({ userId, userRole }) {
  const filter = userRole === 'teacher' ? { teacherId: userId } : {};
  const courses = await courseRepository.listForEditor(filter);
  return courses.map(presenter.editorListRow);
}

async function listMyCourses(userId) {
  const enrollments = await enrollmentRepository.listForUser(userId);
  if (!enrollments.length) return [];

  const courses = await courseRepository.listCardsByIds([
    ...new Set(enrollments.map((e) => e.courseId)),
  ]);
  const courseById = new Map(courses.map((course) => [String(course._id), course]));

  return enrollments.map((enrollment) =>
    presenter.enrolledCourseCard(enrollment, courseById.get(String(enrollment.courseId))),
  );
}

/** API công khai cho feature khác (shop gem) hỏi có khóa trả phí nào không. */
function countPaidPublishedCourses() {
  return courseRepository.countPaidPublished();
}

module.exports = {
  buildCatalogFilter,
  listCatalog,
  listEditorCourses,
  listMyCourses,
  countPaidPublishedCourses,
};
