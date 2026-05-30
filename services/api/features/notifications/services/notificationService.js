const Notification = require('../models/Notification');
const { notificationToClientDto } = require('../lib/notificationDto');
const { publishToUser } = require('../ws/notificationHub');

/**
 * @param {import('mongoose').Document} doc
 */
function pushNotificationRealtime(doc) {
  const dto = notificationToClientDto(doc);
  if (!dto) return;
  publishToUser(String(doc.userId), {
    type: 'notification',
    notification: dto,
    unreadDelta: dto.readAt ? 0 : 1,
  });
}

/**
 * @param {{ userId: string, type?: string, titleVi: string, bodyVi?: string, href?: string, metadata?: object }} payload
 * @param {{ session?: import('mongoose').ClientSession, deferRealtime?: boolean }} [opts]
 */
async function createNotification(payload, opts = {}) {
  const userId = String(payload.userId || '').trim();
  if (!userId) return null;
  const docs = await Notification.create(
    [
      {
        userId,
        type: payload.type || 'system',
        titleVi: String(payload.titleVi || '').trim() || 'Thông báo',
        bodyVi: String(payload.bodyVi || '').trim(),
        href: payload.href ? String(payload.href).trim() : null,
        metadata: payload.metadata || {},
      },
    ],
    opts.session ? { session: opts.session } : undefined,
  );
  const doc = docs[0];
  if (!opts.deferRealtime) {
    pushNotificationRealtime(doc);
  }
  return doc;
}

async function notifyCoursePurchase(
  { userId, courseTitle, courseSlug, txnRef, amount, currency },
  opts = {},
) {
  return createNotification(
    {
      userId,
      type: 'course_purchase',
      titleVi: 'Mua khóa học thành công',
      bodyVi: `Bạn đã mở khóa «${courseTitle}».`,
      href: `/courses/${courseSlug}?enrolled=1`,
      metadata: { txnRef, amount, currency, courseSlug },
    },
    opts,
  );
}

async function notifyFreeEnrollment({ userId, courseTitle, courseSlug }, opts = {}) {
  return createNotification(
    {
      userId,
      type: 'enrollment',
      titleVi: 'Đã ghi danh khóa học',
      bodyVi: `Bạn đã tham gia «${courseTitle}».`,
      href: `/courses/${courseSlug}`,
      metadata: { courseSlug, free: true },
    },
    opts,
  );
}

async function notifyTeacherApplicationDecision({ userId, approved, reviewNote }, opts = {}) {
  return createNotification(
    {
      userId,
      type: 'teacher_application',
      titleVi: approved ? 'Đơn giảng viên được duyệt' : 'Đơn giảng viên chưa được duyệt',
      bodyVi: approved
        ? 'Bạn có thể mở Studio và tạo khóa học.'
        : reviewNote
          ? `Lý do: ${reviewNote}`
          : 'Vui lòng xem email hoặc nộp lại đơn sau.',
      href: approved ? '/studio' : '/apply-teacher',
      metadata: { approved: Boolean(approved) },
    },
    opts,
  );
}

function excerptPlain(text, max = 120) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

async function notifyCommunityCommentOnPost(
  { userId, postId, postTitle, commenterName, commentPreview },
  opts = {},
) {
  return createNotification(
    {
      userId,
      type: 'community_comment',
      titleVi: 'Bình luận mới trên bài của bạn',
      bodyVi: `${commenterName}: ${excerptPlain(commentPreview) || '…'}`,
      href: `/community/post/${postId}`,
      metadata: { postId, postTitle },
    },
    opts,
  );
}

async function notifyCommunityReply(
  { userId, postId, postTitle, commenterName, commentPreview },
  opts = {},
) {
  return createNotification(
    {
      userId,
      type: 'community_reply',
      titleVi: 'Có người trả lời bình luận của bạn',
      bodyVi: `${commenterName}: ${excerptPlain(commentPreview) || '…'}`,
      href: `/community/post/${postId}`,
      metadata: { postId, postTitle },
    },
    opts,
  );
}

async function notifyModerationWarning({ userId, message, postId }, opts = {}) {
  return createNotification(
    {
      userId,
      type: 'moderation_warning',
      titleVi: 'Cảnh báo từ điều hành viên',
      bodyVi: String(message || '').trim().slice(0, 500),
      href: postId ? `/community/post/${postId}` : '/community',
      metadata: { postId: postId || null },
    },
    opts,
  );
}

async function notifyCommunityPostUpvote({ userId, voterName, postId, postTitle }, opts = {}) {
  return createNotification(
    {
      userId,
      type: 'community_post_upvote',
      titleVi: 'Bài viết của bạn được thích',
      bodyVi: `${voterName} đã upvote bài «${String(postTitle || '').trim() || 'của bạn'}».`,
      href: `/community/post/${postId}`,
      metadata: { postId, postTitle },
    },
    opts,
  );
}

async function notifyCommunityCommentUpvote({ userId, voterName, postId, postTitle }, opts = {}) {
  return createNotification(
    {
      userId,
      type: 'community_comment_upvote',
      titleVi: 'Bình luận của bạn được thích',
      bodyVi: `${voterName} đã upvote bình luận trong «${String(postTitle || '').trim() || 'bài viết'}».`,
      href: `/community/post/${postId}`,
      metadata: { postId, postTitle },
    },
    opts,
  );
}

async function notifyEnrollmentRevoked(
  { userId, kind, courseTitle, courseSlug, cohortTitle, reason },
  opts = {},
) {
  const reasonText = String(reason || '').trim();
  const isCohort = kind === 'cohort';
  const titleVi = isCohort ? 'Quyền tham gia lớp đã bị thu hồi' : 'Quyền tự học khóa đã bị thu hồi';
  const targetLabel = isCohort
    ? `lớp «${String(cohortTitle || 'Lớp học').trim()}»`
    : `khóa «${String(courseTitle || courseSlug || 'Khóa học').trim()}»`;
  const bodyVi = `Quản trị viên đã thu hồi quyền ${targetLabel}. Lý do: ${reasonText}`;
  const href = courseSlug ? `/courses/${courseSlug}` : '/courses';

  return createNotification(
    {
      userId,
      type: 'enrollment_revoked',
      titleVi,
      bodyVi,
      href,
      metadata: {
        kind: isCohort ? 'cohort' : 'catalog',
        courseSlug: courseSlug || null,
        cohortTitle: cohortTitle || null,
        reason: reasonText,
      },
    },
    opts,
  );
}

module.exports = {
  createNotification,
  pushNotificationRealtime,
  notificationToClientDto,
  notifyCoursePurchase,
  notifyFreeEnrollment,
  notifyTeacherApplicationDecision,
  notifyCommunityCommentOnPost,
  notifyCommunityReply,
  notifyModerationWarning,
  notifyCommunityPostUpvote,
  notifyCommunityCommentUpvote,
  notifyEnrollmentRevoked,
};
