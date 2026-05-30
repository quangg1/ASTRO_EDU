const User = require('../../auth/models/User');
const Cohort = require('../models/Cohort');
const CohortEnrollment = require('../models/CohortEnrollment');
const { sendCohortInviteEmail } = require('../../../shared/mailer');
const { notifyCohortInviteSent, notifyCohortJoined } = require('./deliveryNotifications');
const { AppError } = require('../../../shared/errors');
const { resolveCohortPrice } = require('../lib/cohortPricing');

function isCohortEnrollmentOpen(cohort, now = new Date()) {
  if (!cohort || cohort.status !== 'open') return false;
  if (cohort.startAt && new Date(cohort.startAt) <= now) return false;
  return true;
}

function publicCohortCard(cohort, course, now = new Date()) {
  const enrollmentOpen = isCohortEnrollmentOpen(cohort, now);
  const pricing = resolveCohortPrice(cohort, course || {});
  return {
    id: cohort._id,
    title: cohort.title,
    slug: cohort.slug,
    startAt: cohort.startAt,
    endAt: cohort.endAt,
    timezone: cohort.timezone || 'Asia/Ho_Chi_Minh',
    status: cohort.status,
    enrollmentOpen,
    price: pricing.price,
    currency: pricing.currency,
    requiresPayment: pricing.requiresPayment,
    catalogPrice: pricing.catalogPrice,
    catalogCurrency: pricing.catalogCurrency,
  };
}

/**
 * @param {{ courseId: import('mongoose').Types.ObjectId; cohortId: string }} params
 */
async function loadEnrollableCohort({ courseId, cohortId }) {
  const cohort = await Cohort.findOne({ _id: cohortId, courseId }).lean();
  if (!cohort) {
    throw new AppError(404, 'COHORT_NOT_FOUND', 'Không tìm thấy lớp');
  }
  if (!isCohortEnrollmentOpen(cohort)) {
    throw new AppError(
      403,
      'ENROLLMENT_CLOSED',
      'Lớp đã bắt đầu hoặc chưa mở đăng ký — chỉ đăng ký trước ngày khai giảng.',
    );
  }
  return cohort;
}

/**
 * Gán học viên vào lớp sau thanh toán / đăng ký kỳ; mã chỉ gửi email.
 */
async function placeStudentInCohort({ userId, course, cohort, session }) {
  const cohortId = cohort._id;
  let en = await CohortEnrollment.findOne({ cohortId, userId }).session(session || null);
  if (!en) {
    const created = await CohortEnrollment.create(
      [{ cohortId, userId, role: 'student' }],
      session ? { session } : {},
    );
    en = created[0];
  }

  const user = await User.findById(userId).select('email displayName').lean();
  const email = user?.email?.trim();
  let emailResult = { sent: false, skipped: true };

  if (email && cohort.inviteCode && !en.inviteCodeEmailSentAt) {
    emailResult = await sendCohortInviteEmail({
      to: email,
      displayName: user?.displayName,
      courseTitle: course.title,
      courseSlug: course.slug,
      cohortTitle: cohort.title,
      inviteCode: cohort.inviteCode,
      startAt: cohort.startAt,
      timezone: cohort.timezone,
    });
    if (emailResult.sent) {
      en.inviteCodeEmailSentAt = new Date();
      await en.save(session ? { session } : {});
    }
  }

  const maskedEmail = email ? maskEmail(email) : null;
  try {
    await notifyCohortInviteSent({
      userId,
      courseTitle: course.title,
      courseSlug: course.slug,
      cohortTitle: cohort.title,
      cohortId: String(cohortId),
      email: maskedEmail,
      emailSent: emailResult.sent,
    });
    await notifyCohortJoined({
      userId,
      courseTitle: course.title,
      courseSlug: course.slug,
      cohortTitle: cohort.title,
      cohortId: String(cohortId),
    });
  } catch (notifyErr) {
    console.error('[cohort] in-app notification failed (enrollment kept):', notifyErr?.message || notifyErr);
  }

  return {
    cohortId: String(cohortId),
    cohortSlug: cohort.slug,
    emailSent: emailResult.sent,
    emailSkipped: emailResult.skipped,
    maskedEmail,
  };
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

module.exports = {
  isCohortEnrollmentOpen,
  publicCohortCard,
  loadEnrollableCohort,
  placeStudentInCohort,
};
