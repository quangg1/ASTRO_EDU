const User = require('../../auth/models/User');
const Cohort = require('../models/Cohort');
const CohortEnrollment = require('../models/CohortEnrollment');
const { sendCohortInviteEmail, isMailConfigured } = require('../../../shared/mailer');
const { notifyCohortInviteSent, notifyCohortJoined } = require('./deliveryNotifications');
const { AppError } = require('../../../shared/errors');
const { resolveCohortPrice } = require('../lib/cohortPricing');

const INVITE_EMAIL_RESEND_COOLDOWN_MS = 120_000;

function cohortInviteEmailMessage(placement) {
  if (placement.emailSent) {
    return 'Mã lớp đã gửi qua email (kiểm tra cả thư rác). Không hiển thị mã trên web.';
  }
  if (placement.emailSkippedReason === 'no_smtp') {
    return 'Đã vào lớp nhưng chưa gửi được email — SMTP chưa cấu hình trên server. Bấm «Gửi lại email» hoặc liên hệ giáo viên.';
  }
  if (placement.emailSkippedReason === 'no_email') {
    return 'Đã vào lớp — tài khoản chưa có email. Cập nhật hồ sơ hoặc liên hệ giáo viên.';
  }
  if (placement.emailSkippedReason === 'no_invite_code') {
    return 'Đã vào lớp — lớp chưa có mã. Liên hệ giáo viên.';
  }
  if (placement.emailSkippedReason === 'smtp_error') {
    return 'Đã vào lớp nhưng gửi email thất bại. Bấm «Gửi lại email» sau vài phút hoặc liên hệ giáo viên.';
  }
  return 'Đã vào lớp. Mã lớp gửi qua email — nếu chưa nhận, bấm «Gửi lại email» hoặc xem thông báo trên app.';
}

async function trySendCohortInviteEmail({ en, user, course, cohort, session, allowResend = false }) {
  const email = user?.email?.trim();
  if (!email) {
    return { sent: false, skipped: true, emailSkippedReason: 'no_email' };
  }
  if (!cohort.inviteCode) {
    return { sent: false, skipped: true, emailSkippedReason: 'no_invite_code' };
  }
  if (en.inviteCodeEmailSentAt && !allowResend) {
    return { sent: true, skipped: false, alreadySent: true };
  }
  if (allowResend && en.inviteCodeEmailSentAt) {
    const elapsed = Date.now() - new Date(en.inviteCodeEmailSentAt).getTime();
    if (elapsed < INVITE_EMAIL_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((INVITE_EMAIL_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new AppError(
        429,
        'INVITE_EMAIL_COOLDOWN',
        `Vui lòng đợi ${waitSec} giây trước khi gửi lại email.`,
      );
    }
  }
  if (!isMailConfigured()) {
    console.warn('[cohort] invite email skipped — SMTP chưa cấu hình (SMTP_HOST/USER/PASS/MAIL_FROM)');
    return { sent: false, skipped: true, emailSkippedReason: 'no_smtp' };
  }

  const emailResult = await sendCohortInviteEmail({
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
    return { sent: true, skipped: false };
  }

  console.error('[cohort] invite email failed:', emailResult.error || 'unknown');
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
  const emailResult = await trySendCohortInviteEmail({
    en,
    user,
    course,
    cohort,
    session,
    allowResend: false,
  });

  const maskedEmail = user?.email?.trim() ? maskEmail(user.email.trim()) : null;
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
    emailSkippedReason: emailResult.emailSkippedReason || null,
    maskedEmail,
  };
}

/**
 * Gửi lại email mã lớp — học viên đã trong lớp, chưa nhận được thư.
 */
async function resendCohortInviteEmail({ userId, course, cohortId }) {
  const cohort = await Cohort.findOne({ _id: cohortId, courseId: course._id });
  if (!cohort) {
    throw new AppError(404, 'COHORT_NOT_FOUND', 'Không tìm thấy lớp');
  }
  const en = await CohortEnrollment.findOne({ cohortId: cohort._id, userId });
  if (!en) {
    throw new AppError(403, 'NOT_ENROLLED', 'Bạn chưa tham gia lớp này');
  }
  const user = await User.findById(userId).select('email displayName').lean();
  const emailResult = await trySendCohortInviteEmail({
    en,
    user,
    course,
    cohort,
    session: null,
    allowResend: true,
  });
  const maskedEmail = user?.email?.trim() ? maskEmail(user.email.trim()) : null;
  if (emailResult.sent) {
    await notifyCohortInviteSent({
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
    message: cohortInviteEmailMessage({
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

module.exports = {
  isCohortEnrollmentOpen,
  publicCohortCard,
  loadEnrollableCohort,
  placeStudentInCohort,
  resendCohortInviteEmail,
  cohortInviteEmailMessage,
};
