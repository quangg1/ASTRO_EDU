const { AppError } = require('../../../shared/errors');
const commentRepository = require('../repositories/commentRepository');
const postRepository = require('../repositories/postRepository');
const forumRepository = require('../repositories/forumRepository');
const { applyVote } = require('./voteService');
const { canAccessModToolsOrAdminOverride } = require('../lib/moderationAccess');
const { isNewsForum } = require('../constants/forumCatalog');
const { enrichCommentsWithAuthors } = require('../../users/publicProfileService');
const {
  canMarkCommentHelpful,
  maybeRewardHelpfulAnswer,
  maybeRewardCommentUpvote,
} = require('./communityGemService');

const COMMENT_NOT_FOUND = 'Không tìm thấy bình luận';

/** Bình luận + bài + forum luôn cần đi cùng nhau để xét luật thưởng gem. */
async function loadCommentContext(commentId) {
  const comment = await commentRepository.findById(commentId);
  if (!comment || comment.isHidden) throw AppError.notFound(COMMENT_NOT_FOUND);

  const post = await postRepository.findById(comment.postId);
  if (!post) throw AppError.notFound('Không tìm thấy bài viết');

  const forum = post.forumId ? await forumRepository.findById(post.forumId) : null;
  return { comment, post, forum };
}

async function voteComment({ commentId, viewer, value }) {
  const { comment, post, forum } = await loadCommentContext(commentId);

  const { delta, myVote, shouldNotifyUpvote } = await applyVote({
    targetType: 'comment',
    targetId: comment._id,
    userId: viewer.userId,
    value,
    authorId: comment.authorId,
    voterName: viewer.voterName,
    postId: String(comment.postId),
    postTitle: post.title,
  });

  const updated = await commentRepository.incrementVoteCount(comment._id, delta);

  let gemReward = null;
  if (shouldNotifyUpvote && myVote === 1 && forum && !isNewsForum(forum)) {
    try {
      gemReward = await maybeRewardCommentUpvote({
        comment: updated,
        post,
        forum,
        voterId: viewer.userId,
      });
    } catch (err) {
      console.error('Community upvote gem reward error:', err);
    }
  }

  return { voteCount: updated.voteCount, myVote, gemReward };
}

async function markCommentHelpful({ commentId, viewer }) {
  const { comment, post, forum } = await loadCommentContext(commentId);

  if (comment.isHelpful) throw AppError.conflict('Bình luận đã được đánh dấu hữu ích');
  if (post.isHidden) throw AppError.forbidden('Bài viết đã bị ẩn');
  if (!forum || isNewsForum(forum)) throw AppError.badRequest('Không áp dụng cho kênh tin');

  const canModTools = canAccessModToolsOrAdminOverride(viewer.role, viewer.doc);
  const allowed = canMarkCommentHelpful({
    markerId: viewer.userId,
    markerRole: viewer.role,
    postAuthorId: post.authorId,
    commentAuthorId: comment.authorId,
    canModTools,
  });
  if (!allowed) throw AppError.forbidden('Bạn không có quyền đánh dấu hữu ích');

  // Xét thưởng trước khi đặt cờ: luật thưởng yêu cầu `isHelpful` còn false.
  let gemReward = null;
  try {
    gemReward = await maybeRewardHelpfulAnswer({
      comment,
      post,
      forum,
      markerId: viewer.userId,
      markerRole: viewer.role,
      canModTools,
    });
  } catch (err) {
    console.error('Community helpful gem reward error:', err);
  }

  const updated = await commentRepository.markHelpful(comment._id, viewer.userId);
  const [enriched] = await enrichCommentsWithAuthors([updated]);
  return { comment: enriched, gemReward };
}

module.exports = { voteComment, markCommentHelpful };
