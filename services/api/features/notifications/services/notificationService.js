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

/**
 * Tin nhắn riêng — gộp vào một thông báo chưa đọc / cuộc trò chuyện (tránh spam chuông).
 */
async function notifyDirectMessage(
  { userId, senderName, messagePreview, conversationId, senderId },
  opts = {},
) {
  const uid = String(userId || '').trim();
  const convId = String(conversationId || '').trim();
  if (!uid || !convId) return null;

  const titleVi = `${String(senderName || 'Học viên').trim()} nhắn tin`;
  const bodyVi = String(messagePreview || '').trim() || '…';
  const href = `/messages/${encodeURIComponent(convId)}`;

  const existing = await Notification.findOne({
    userId: uid,
    type: 'direct_message',
    readAt: null,
    'metadata.conversationId': convId,
  })
    .sort({ createdAt: -1 })
    .exec();

  if (existing) {
    existing.titleVi = titleVi;
    existing.bodyVi = bodyVi;
    existing.href = href;
    existing.metadata = {
      ...(existing.metadata || {}),
      conversationId: convId,
      senderId: senderId ? String(senderId) : null,
    };
    await existing.save();
    if (!opts.deferRealtime) {
      const dto = notificationToClientDto(existing);
      if (dto) {
        publishToUser(uid, {
          type: 'notification',
          notification: dto,
          unreadDelta: 0,
        });
      }
    }
    return existing;
  }

  return createNotification(
    {
      userId: uid,
      type: 'direct_message',
      titleVi,
      bodyVi,
      href,
      metadata: {
        conversationId: convId,
        senderId: senderId ? String(senderId) : null,
      },
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

const BROADCAST_BATCH = 200;

function chunkIds(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Bulk-create admin broadcast notifications and push realtime per doc.
 * @param {{
 *   userIds: string[],
 *   titleVi: string,
 *   bodyVi?: string,
 *   href?: string|null,
 *   metadata?: object,
 * }} payload
 */
async function createAdminBroadcastNotifications({
  userIds,
  titleVi,
  bodyVi,
  href,
  metadata = {},
}) {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!ids.length) return { recipientCount: 0 };

  const title = String(titleVi || '').trim() || 'Thông báo';
  const body = String(bodyVi || '').trim();
  const link = href ? String(href).trim() : null;

  let sent = 0;
  for (const batch of chunkIds(ids, BROADCAST_BATCH)) {
    const docs = await Notification.insertMany(
      batch.map((userId) => ({
        userId,
        type: 'admin_broadcast',
        titleVi: title,
        bodyVi: body,
        href: link,
        metadata,
      })),
      { ordered: false },
    );
    sent += docs.length;
    for (const doc of docs) {
      pushNotificationRealtime(doc);
    }
  }

  return { recipientCount: sent };
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
  notifyDirectMessage,
  createAdminBroadcastNotifications,
};
