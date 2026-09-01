const { cohortScheduleRepository } = require('../repositories');
const { scheduleMapFromRows, buildSyllabusLessons } = require('./scheduleResolver');
const presenter = require('../presenters/cohortPresenter');

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function moduleOutline(module) {
  return {
    _id: module._id,
    title: module.title,
    slug: module.slug,
    icon: module.icon || '',
    order: module.order ?? 0,
    materials: (module.materials || []).map((material) => ({
      id: material.id,
      label: material.label || '',
      kind: material.kind || 'pdf',
      url: material.url,
    })),
  };
}

/** Learner-facing syllabus: course outline with this cohort's dates applied. */
async function buildCohortSyllabus({ course, cohort }) {
  const rows = await cohortScheduleRepository.listForCohort(cohort._id);
  const scheduleMap = scheduleMapFromRows(rows);

  return {
    cohort: presenter.cohortSummary(cohort),
    course: { slug: course.slug, title: course.title },
    modules: [...(course.modules || [])].sort(byOrder).map(moduleOutline),
    lessons: buildSyllabusLessons(course, scheduleMap),
  };
}

module.exports = { buildCohortSyllabus };
