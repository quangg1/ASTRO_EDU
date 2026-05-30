const {
  createNotification,
} = require('../../notifications/services/notificationService');

async function notifyCohortJoined({ userId, courseTitle, courseSlug, cohortTitle, cohortId }) {
  return createNotification({
    userId,
    type: 'cohort_enrollment',
    titleVi: 'Đã tham gia lớp học',
    bodyVi: `Bạn đã vào lớp «${cohortTitle}» — khóa «${courseTitle}».`,
    href: `/courses/${courseSlug}/cohort/${cohortId}`,
    metadata: { courseSlug, cohortId },
  });
}

/** Thông báo in-app — không chứa mã lớp (mã chỉ trong email). */
async function notifyCohortInviteSent({
  userId,
  courseTitle,
  courseSlug,
  cohortTitle,
  cohortId,
  email,
  emailSent,
}) {
  const emailHint = email
    ? emailSent
      ? `Mã lớp đã gửi tới ${email}. Kiểm tra hộp thư (cả thư rác).`
      : `Không gửi được email tới ${email} — liên hệ giáo viên để nhận mã.`
    : 'Chưa có email trên tài khoản — cập nhật hồ sơ hoặc liên hệ giáo viên.';
  return createNotification({
    userId,
    type: 'cohort_invite_email',
    titleVi: 'Đăng ký lớp thành công',
    bodyVi: `«${cohortTitle}» — ${courseTitle}. ${emailHint}`,
    href: `/courses/${courseSlug}/cohort/${cohortId}`,
    metadata: { courseSlug, cohortId, emailSent: !!emailSent, noCodeInApp: true },
  });
}

async function notifyAssignmentSubmitted({ teacherId, courseTitle, courseSlug, cohortId, lessonTitle, studentId }) {
  if (!teacherId) return null;
  return createNotification({
    userId: teacherId,
    type: 'assignment_submitted',
    titleVi: 'Bài tập mới cần chấm',
    bodyVi: `Học viên nộp «${lessonTitle}» — ${courseTitle}.`,
    href: `/studio/${courseSlug}/cohorts`,
    metadata: { courseSlug, cohortId, lessonTitle, studentId },
  });
}

async function notifyAssignmentGraded({
  userId,
  courseTitle,
  courseSlug,
  cohortId,
  lessonSlug,
  lessonTitle,
  grade,
}) {
  const href =
    cohortId && lessonSlug
      ? `/courses/${courseSlug}/cohort/${cohortId}/assignment/${lessonSlug}`
      : `/courses/${courseSlug}`;
  return createNotification({
    userId,
    type: 'assignment_graded',
    titleVi: 'Bài tập đã được chấm',
    bodyVi:
      grade != null
        ? `«${lessonTitle}» — ${courseTitle}: điểm ${grade}.`
        : `«${lessonTitle}» — ${courseTitle} đã có phản hồi.`,
    href,
    metadata: { courseSlug, cohortId, lessonSlug, lessonTitle, grade },
  });
}

module.exports = {
  notifyCohortJoined,
  notifyCohortInviteSent,
  notifyAssignmentSubmitted,
  notifyAssignmentGraded,
};
