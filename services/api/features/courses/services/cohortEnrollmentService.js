const User = require('../../auth/models/User');
const Cohort = require('../models/Cohort');
const CohortEnrollment = require('../models/CohortEnrollment');
const { sendCohortEnrollmentEmail, isMailConfigured } = require('../../../shared/mailer');
const { notifyCohortEnrollmentConfirmed, notifyCohortJoined } = require('./deliveryNotifications');
const { AppError } = require('../../../shared/errors');
const { resolveCohortPrice } = require('../lib/cohortPricing');

const ENROLLMENT_EMAIL_RESEND_COOLDOWN_MS = 120_000;

function cohortEnrollmentEmailMessage(placement) {
  if (placement.emailSent) {
    return 'Email xác nhận đã gửi — kiểm tra hộp thư (cả thư rác).';
  }
  if (placement.emailSkippedReason === 'no_smtp') {
    return 'Đã vào lớp nhưng chưa gửi được email — SMTP chưa cấu hình. Bấm «Gửi lại email» hoặc liên hệ giáo viên.';
  }
  if (placement.emailSkippedReason === 'no_email') {
    return 'Đã vào lớp — tài khoản chưa có email. Cập nhật hồ sơ hoặc liên hệ giáo viên.';
  }
  if (placement.emailSkippedReason === 'smtp_error') {
    return 'Đã vào lớp nhưng gửi email thất bại. Bấm «Gửi lại email» sau vài phút hoặc liên hệ giáo viên.';
  }
  return 'Đã vào lớp. Email xác nhận gửi qua hộp thư — nếu chưa nhận, bấm «Gửi lại email».';
}

async function trySendCohortEnrollmentEmail({ en, user, course, cohort, session, allowResend = false }) {
  const email = user?.email?.trim();
  if (!email) {
    return { sent: false, skipped: true, emailSkippedReason: 'no_email' };
  }
  if (en.inviteCodeEmailSentAt && !allowResend) {
    return { sent: true, skipped: false, alreadySent: true };
  }
  if (allowResend && en.inviteCodeEmailSentAt) {
    const elapsed = Date.now() - new Date(en.inviteCodeEmailSentAt).getTime();
    if (elapsed < ENROLLMENT_EMAIL_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((ENROLLMENT_EMAIL_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new AppError(
        429,
        'ENROLLMENT_EMAIL_COOLDOWN',
        `Vui lòng đợi ${waitSec} giây trước khi gửi lại email.`,
      );
    }
  }
  if (!isMailConfigured()) {
    console.warn('[cohort] enrollment email skipped — SMTP chưa cấu hình');
    return { sent: false, skipped: true, emailSkippedReason: 'no_smtp' };
  }

  const emailResult = await sendCohortEnrollmentEmail({
    to: email,
    displayName: user?.displayName,
    courseTitle: course.title,
    courseSlug: course.slug,
    cohortTitle: cohort.title,
    cohortId: String(cohort._id),
    startAt: cohort.startAt,
    timezone: cohort.timezone,
  });

  if (emailResult.sent) {
    en.inviteCodeEmailSentAt = new Date();
    await en.save(session ? { session } : {});
    return { sent: true, skipped: false };
  }

  console.error('[cohort] enrollment email failed:', emailResult.error || 'unknown');
  return {
    sent: false,
    skipped: !!emailResult.skipped,
    emailSkippedReason: emailResult.skipped ? 'no_smtp' : 'smtp_error',
    emailError: emailResult.error || null,
  };
}

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
  const emailResult = await trySendCohortEnrollmentEmail({
    en,
    user,
    course,
    cohort,
    session,
    allowResend: false,
  });

  const maskedEmail = user?.email?.trim() ? maskEmail(user.email.trim()) : null;
  try {
    await notifyCohortEnrollmentConfirmed({
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
    emailSkippedReason: emailResult.emailSkippedReason || null,
    maskedEmail,
  };
}

async function resendCohortEnrollmentEmail({ userId, course, cohortId }) {
  const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id });
  if (!cohort) {
    throw new AppError(404, 'COHORT_NOT_FOUND', 'Không tìm thấy lớp');
  }
  const en = await CohortEnrollment.findOne({ cohortId: cohort._id, userId });
  if (!en) {
    throw new AppError(403, 'NOT_ENROLLED', 'Bạn chưa tham gia lớp này');
  }
  const user = await User.findById(userId).select('email displayName').lean();
  const emailResult = await trySendCohortEnrollmentEmail({
    en,
    user,
    course,
    cohort,
    session: null,
    allowResend: true,
  });
  const maskedEmail = user?.email?.trim() ? maskEmail(user.email.trim()) : null;
  if (emailResult.sent) {
    await notifyCohortEnrollmentConfirmed({
      userId,
      courseTitle: course.title,
      courseSlug: course.slug,
      cohortTitle: cohort.title,
      cohortId: String(cohort._id),
      email: maskedEmail,
      emailSent: true,
    });
  }
  return {
    cohortId: String(cohort._id),
    emailSent: emailResult.sent,
    emailSkippedReason: emailResult.emailSkippedReason || null,
    maskedEmail,
    message: cohortEnrollmentEmailMessage({
      emailSent: emailResult.sent,
      emailSkippedReason: emailResult.emailSkippedReason,
    }),
  };
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

/** @deprecated */
const cohortInviteEmailMessage = cohortEnrollmentEmailMessage;
const resendCohortInviteEmail = resendCohortEnrollmentEmail;

module.exports = {
  isCohortEnrollmentOpen,
  publicCohortCard,
  loadEnrollableCohort,
  placeStudentInCohort,
  resendCohortEnrollmentEmail,
  resendCohortInviteEmail,
  cohortEnrollmentEmailMessage,
  cohortInviteEmailMessage,
};
