const { courseRequiresPayment } = require('../lib/coursePricing');
const { resolveDistributionStrategy } = require('../lib/distributionStrategy');

const OUTLINE_DESCRIPTION_LIMIT = 560;
const PAYWALL_DESCRIPTION_LIMIT = 400;
const DEFAULT_CROSS_SELL_HREF = '/tutorial';
const DEFAULT_CROSS_SELL_LABEL = 'Học thêm miễn phí · Lộ trình';

function truncate(text, limit) {
  const value = typeof text === 'string' ? text : '';
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function trimmedOr(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizedPrice(value) {
  return Math.round(Number(value) || 0);
}

/** Shared shape for catalog cards and the studio list. */
function baseCourseCard(course) {
  const price = normalizedPrice(course.price);
  const isPaid = Boolean(course.isPaid);
  return {
    id: String(course._id),
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    lessonCount: (course.lessons || []).length,
    durationWeeks: course.durationWeeks ?? null,
    price,
    currency: course.currency ?? 'VND',
    isPaid,
    requiresPayment: courseRequiresPayment({ isPaid, price }),
  };
}

function catalogCard(course) {
  return baseCourseCard(course);
}

function editorListRow(course) {
  return {
    ...baseCourseCard(course),
    published: course.published ?? false,
    catalogEnabled: course.catalogEnabled !== false,
    distributionStrategy: resolveDistributionStrategy(course),
  };
}

function enrolledCourseCard(enrollment, course) {
  const totalLessons = (course?.lessons || []).length;
  const progress = enrollment.progress || [];
  const completedCount = progress.filter((entry) => entry.completed).length;
  return {
    id: enrollment._id,
    courseId: enrollment.courseId,
    title: course?.title || 'Khóa học',
    slug: course?.slug || '',
    description: course?.description || '',
    thumbnail: course?.thumbnail,
    level: course?.level || 'beginner',
    lessonCount: totalLessons,
    enrolledAt: enrollment.enrolledAt,
    progress,
    completedCount,
    totalLessons,
    percentComplete: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
  };
}

/** Metadata-only lesson: safe to expose before enrolment. */
function lessonOutline(lesson) {
  return {
    title: lesson.title,
    slug: lesson.slug,
    description: truncate(lesson.description, OUTLINE_DESCRIPTION_LIMIT),
    type: lesson.type || 'text',
    order: lesson.order ?? 0,
    moduleId: lesson.moduleId || null,
    week: lesson.week ?? null,
    visualizationId: lesson.visualizationId || null,
    quizQuestionCount: Array.isArray(lesson.quizQuestions) ? lesson.quizQuestions.length : 0,
    sectionCount: Array.isArray(lesson.sections) ? lesson.sections.length : 0,
  };
}

/** Outline plus every content field explicitly blanked, for paid courses. */
function paywalledLesson(lesson) {
  return {
    ...lessonOutline({
      ...lesson,
      description: truncate(lesson.description, PAYWALL_DESCRIPTION_LIMIT),
    }),
    content: '',
    sections: [],
    quizQuestions: [],
    resourceLinks: [],
    galleryImages: [],
    videoUrl: null,
    coverImage: null,
    learningGoals: [],
    sourcePdf: null,
    sourcePageCount: null,
    stageTime: null,
  };
}

function courseDetail({
  course,
  modules,
  lessons,
  enrollment,
  teacher,
  outlineOnly,
  locksContent,
  staffAccess,
  deliveryContext,
}) {
  return {
    id: course._id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    durationWeeks: course.durationWeeks ?? null,
    price: normalizedPrice(course.price),
    currency: course.currency ?? 'VND',
    cohortPrice: course.cohortPrice != null ? Math.round(Number(course.cohortPrice)) : null,
    cohortCurrency: course.cohortCurrency || null,
    isPaid: Boolean(course.isPaid),
    requiresPayment: courseRequiresPayment(course),
    catalogEnabled: course.catalogEnabled !== false,
    distributionStrategy: resolveDistributionStrategy(course),
    modules,
    lessons,
    enrollment: enrollment
      ? { enrolledAt: enrollment.enrolledAt, progress: enrollment.progress || [] }
      : null,
    outlineOnly: Boolean(outlineOnly),
    paywalledLessonBodies: outlineOnly ? true : locksContent,
    crossSellTutorialHref: trimmedOr(course.crossSellTutorialHref, DEFAULT_CROSS_SELL_HREF),
    crossSellTutorialLabelVi: trimmedOr(course.crossSellTutorialLabelVi, DEFAULT_CROSS_SELL_LABEL),
    crossSellTutorialBodyVi:
      typeof course.crossSellTutorialBodyVi === 'string' ? course.crossSellTutorialBodyVi : '',
    published: Boolean(course.published),
    editorPreview: Boolean(!course.published),
    staffAccess,
    teacherId: course.teacherId || null,
    teacher,
    deliveryContext: deliveryContext || { mode: 'catalog' },
  };
}

function editorDetail(course) {
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  return {
    id: course._id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    level: course.level,
    durationWeeks: course.durationWeeks,
    published: course.published,
    price: normalizedPrice(course.price),
    currency: course.currency ?? 'VND',
    isPaid: Boolean(course.isPaid),
    requiresPayment: courseRequiresPayment(course),
    catalogEnabled: course.catalogEnabled !== false,
    distributionStrategy: resolveDistributionStrategy(course),
    crossSellTutorialHref: course.crossSellTutorialHref ?? DEFAULT_CROSS_SELL_HREF,
    crossSellTutorialLabelVi: course.crossSellTutorialLabelVi ?? '',
    crossSellTutorialBodyVi: course.crossSellTutorialBodyVi ?? '',
    teacherId: course.teacherId || null,
    modules: [...(course.modules || [])].sort(byOrder),
    lessons: [...(course.lessons || [])].sort(byOrder),
  };
}

function createdCourse(course) {
  return {
    id: course._id,
    title: course.title,
    slug: course.slug,
    published: course.published === true,
  };
}

function enrollmentState(enrollment) {
  return { enrolledAt: enrollment.enrolledAt, progress: enrollment.progress || [] };
}

/** Flat 400 body kept for the checkout flow, mirroring the cohort paywall. */
function coursePaymentRequired(course) {
  return {
    success: false,
    requiresPayment: true,
    error: 'Khóa học trả phí. Vui lòng thanh toán.',
    courseId: String(course._id),
    courseSlug: course.slug,
    amount: course.price,
    currency: course.currency || 'VND',
  };
}

module.exports = {
  catalogCard,
  editorListRow,
  enrolledCourseCard,
  lessonOutline,
  paywalledLesson,
  courseDetail,
  editorDetail,
  createdCourse,
  enrollmentState,
  coursePaymentRequired,
};
