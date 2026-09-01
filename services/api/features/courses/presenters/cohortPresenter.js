/**
 * Persistence shape -> API shape.
 *
 * Keeping presentation here means services can return domain data freely
 * without accidentally leaking internal fields (invite codes, raw ids) and the
 * response contract for each endpoint is readable in one place.
 */

function learnerCohortCard(cohort, enrollment) {
  return {
    id: cohort._id,
    title: cohort.title,
    slug: cohort.slug,
    status: cohort.status,
    startAt: cohort.startAt,
    endAt: cohort.endAt,
    inviteEmailSent: Boolean(enrollment?.inviteCodeEmailSentAt),
  };
}

function manageCohortRow(cohort, studentCount = 0) {
  return {
    id: cohort._id,
    title: cohort.title,
    slug: cohort.slug,
    status: cohort.status,
    timezone: cohort.timezone,
    inviteCode: cohort.inviteCode,
    startAt: cohort.startAt,
    endAt: cohort.endAt,
    studentCount,
    price: cohort.price != null ? Math.round(Number(cohort.price)) : null,
    currency: cohort.currency || null,
  };
}

function cohortSummary(cohort) {
  return {
    id: cohort._id,
    title: cohort.title,
    slug: cohort.slug,
    timezone: cohort.timezone,
    startAt: cohort.startAt,
    endAt: cohort.endAt,
  };
}

function announcement(doc) {
  return {
    id: doc._id,
    title: doc.title,
    body: doc.body,
    pinned: doc.pinned,
    notifyEmail: doc.notifyEmail,
    authorId: doc.authorId,
    createdAt: doc.createdAt,
  };
}

/**
 * 402 body for a cohort that needs paying for.
 *
 * Deliberately flat rather than nested under `details`: the checkout screen
 * reads `requiresPayment`, `amount` and `courseSlug` straight off the response.
 */
function paymentRequired({ course, cohortId, pricing }) {
  return {
    success: false,
    code: 'payment_required',
    requiresPayment: true,
    error: pricing.isCatalogUpgrade
      ? 'Chỉ cần thanh toán phần chênh lệch lên lớp có GV.'
      : 'Lớp có học phí — thanh toán trên trang khóa học.',
    courseSlug: course.slug,
    courseId: String(course._id),
    amount: pricing.listPrice,
    currency: pricing.currency,
    cohortId,
    cohortFullPrice: pricing.cohortFullPrice,
    catalogCredit: pricing.catalogCredit,
    isCatalogUpgrade: pricing.isCatalogUpgrade,
    catalogPrice: pricing.catalogPrice,
    catalogCurrency: pricing.catalogCurrency,
  };
}

function submissionRow(row, { studentName, lessonTitle }) {
  return {
    id: row._id,
    userId: row.userId,
    studentName,
    lessonSlug: row.lessonSlug,
    lessonTitle,
    status: row.status,
    submittedAt: row.submittedAt,
    isLate: row.isLate,
    grade: row.grade,
    feedback: row.feedback,
    gradedAt: row.gradedAt,
    files: row.files || [],
    note: row.note,
  };
}

module.exports = {
  learnerCohortCard,
  manageCohortRow,
  cohortSummary,
  announcement,
  paymentRequired,
  submissionRow,
};
