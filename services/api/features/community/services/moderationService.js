const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Forum = require('../models/Forum');
const CommunityReport = require('../models/CommunityReport');
const ModerationWarning = require('../models/ModerationWarning');
const { isNewsForum } = require('../constants/forumCatalog');
const {
  enrichPostsWithAuthors,
  enrichCommentsWithAuthors,
} = require('../../users/publicProfileService');
const { notifyModerationWarning } = require('../../notifications/services/notificationService');

const REPORT_REASONS = new Set([
  'spam',
  'harassment',
  'off-topic',
  'misinformation',
  'copyright',
  'other',
]);

async function createReport({ reporterId, reporterName, targetType, targetId, reason, details }) {
  const normReason = String(reason || '').trim();
  if (!REPORT_REASONS.has(normReason)) {
    const err = new Error('Lý do báo cáo không hợp lệ');
    err.status = 400;
    throw err;
  }

  let postId = null;
  if (targetType === 'post') {
    const post = await Post.findById(targetId).lean();
    if (!post) {
      const err = new Error('Không tìm thấy bài viết');
      err.status = 404;
      throw err;
    }
    postId = post._id;
  } else if (targetType === 'comment') {
    const comment = await Comment.findById(targetId).lean();
    if (!comment) {
      const err = new Error('Không tìm thấy bình luận');
      err.status = 404;
      throw err;
    }
    postId = comment.postId;
  } else {
    const err = new Error('Loại báo cáo không hợp lệ');
    err.status = 400;
    throw err;
  }

  const existing = await CommunityReport.findOne({
    reporterId,
    targetType,
    targetId,
    status: 'open',
  }).lean();
  if (existing) {
    const err = new Error('Bạn đã báo cáo mục này và đang chờ xử lý');
    err.status = 409;
    throw err;
  }

  const report = await CommunityReport.create({
    targetType,
    targetId,
    postId,
    reporterId,
    reporterName: reporterName || 'User',
    reason: normReason,
    details: String(details || '').trim().slice(0, 2000),
  });

  if (targetType === 'post') {
    await Post.findByIdAndUpdate(targetId, { $inc: { reportCount: 1 } });
  } else {
    await Comment.findByIdAndUpdate(targetId, { $inc: { reportCount: 1 } });
  }

  return report.toObject();
}

async function loadQueueItem(report) {
  let target = null;
  let post = null;
  if (report.targetType === 'post') {
    post = await Post.findById(report.targetId).lean();
    target = post;
  } else {
    const comment = await Comment.findById(report.targetId).lean();
    target = comment;
    if (comment?.postId) post = await Post.findById(comment.postId).lean();
  }
  if (!target) return null;

  const forum = post ? await Forum.findById(post.forumId).lean() : null;
  const [enrichedTarget] =
    report.targetType === 'post'
      ? await enrichPostsWithAuthors([target])
      : await enrichCommentsWithAuthors([target]);

  return {
    report,
    target: enrichedTarget,
    targetType: report.targetType,
    post: post
      ? {
          _id: post._id,
          title: post.title,
          forumId: post.forumId,
          forumSlug: forum?.slug,
          forumTitle: forum?.title,
          isNews: forum ? isNewsForum(forum) : false,
        }
      : null,
  };
}

async function getModerationQueue({ status = 'open', limit = 40 }) {
  const reports = await CommunityReport.find({ status })
    .sort({ createdAt: -1 })
    .limit(Math.min(100, limit))
    .lean();

  const items = [];
  for (const r of reports) {
    const item = await loadQueueItem(r);
    if (item) items.push(item);
  }

  const [openCount, hiddenPosts, hiddenComments] = await Promise.all([
    CommunityReport.countDocuments({ status: 'open' }),
    Post.countDocuments({ isHidden: true }),
    Comment.countDocuments({ isHidden: true }),
  ]);

  return {
    items,
    stats: {
      openReports: openCount,
      hiddenPosts,
      hiddenComments,
    },
  };
}

async function resolveReport({ reportId, moderatorId, status, resolutionNote }) {
  const report = await CommunityReport.findById(reportId);
  if (!report) {
    const err = new Error('Không tìm thấy báo cáo');
    err.status = 404;
    throw err;
  }
  if (!['resolved', 'dismissed'].includes(status)) {
    const err = new Error('Trạng thái không hợp lệ');
    err.status = 400;
    throw err;
  }
  report.status = status;
  report.resolvedBy = moderatorId;
  report.resolutionNote = String(resolutionNote || '').trim().slice(0, 500);
  await report.save();
  return report.toObject();
}

async function setPostHidden({ postId, hidden, moderatorId }) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error('Không tìm thấy bài viết');
    err.status = 404;
    throw err;
  }
  post.isHidden = Boolean(hidden);
  post.hiddenAt = hidden ? new Date() : null;
  post.hiddenBy = hidden ? moderatorId : null;
  await post.save();
  return post.toObject();
}

async function setCommentHidden({ commentId, hidden, moderatorId }) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error('Không tìm thấy bình luận');
    err.status = 404;
    throw err;
  }
  comment.isHidden = Boolean(hidden);
  comment.hiddenAt = hidden ? new Date() : null;
  comment.hiddenBy = hidden ? moderatorId : null;
  await comment.save();
  return comment.toObject();
}

async function deleteComment({ commentId }) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error('Không tìm thấy bình luận');
    err.status = 404;
    throw err;
  }
  await Comment.deleteMany({ parentId: comment._id });
  await Comment.findByIdAndDelete(comment._id);
  await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });
  await CommunityReport.updateMany(
    { targetType: 'comment', targetId: comment._id, status: 'open' },
    { status: 'resolved', resolutionNote: 'Bình luận đã xóa' },
  );
  return { deleted: true };
}

async function issueWarning({ userId, message, issuedBy, issuedByName, relatedReportId, postId }) {
  const warning = await ModerationWarning.create({
    userId,
    message: String(message || '').trim().slice(0, 1000),
    issuedBy,
    issuedByName: issuedByName || 'Moderator',
    relatedReportId: relatedReportId || null,
    postId: postId || null,
  });
  void notifyModerationWarning({
    userId: String(userId),
    message: warning.message,
    postId: postId ? String(postId) : null,
  });
  return warning.toObject();
}

module.exports = {
  REPORT_REASONS: [...REPORT_REASONS],
  createReport,
  getModerationQueue,
  resolveReport,
  setPostHidden,
  setCommentHidden,
  deleteComment,
  issueWarning,
};
