const { AppError } = require('../../../shared/errors');
const postRepository = require('../repositories/postRepository');
const commentRepository = require('../repositories/commentRepository');
const forumRepository = require('../repositories/forumRepository');
const voteRepository = require('../repositories/voteRepository');
const { applyVote, mapMyVotes } = require('./voteService');
const {
  publicVisibilityFilter,
  canAccessModToolsOrAdminOverride,
} = require('../lib/moderationAccess');
const { sanitizeDiscussionHtml, isEffectivelyEmptyHtml } = require('../lib/sanitizeHtml');
const {
  enrichPostsWithAuthors,
  enrichCommentsWithAuthors,
} = require('../../users/publicProfileService');
const {
  notifyCommunityCommentOnPost,
  notifyCommunityReply,
} = require('../../notifications/services/notificationService');
const presenter = require('../presenters/communityPresenter');

const POST_NOT_FOUND = 'Không tìm thấy bài viết';

/** Bài bị ẩn coi như không tồn tại với người xem thường. */
async function loadVisiblePost(postId, viewer) {
  const post = await postRepository.findById(postId);
  if (!post) throw AppError.notFound(POST_NOT_FOUND);
  if (post.isHidden && !canAccessModToolsOrAdminOverride(viewer.role, viewer.doc)) {
    throw AppError.notFound(POST_NOT_FOUND);
  }
  return post;
}

function assertCanModerate(viewer) {
  if (!canAccessModToolsOrAdminOverride(viewer.role, viewer.doc)) {
    throw AppError.forbidden('Không có quyền kiểm duyệt');
  }
}

async function getPostDetail({ postId, viewer }) {
  const post = await loadVisiblePost(postId, viewer);

  const rawComments = await commentRepository.listForPost(
    post._id,
    publicVisibilityFilter(viewer.role, viewer.doc),
  );

  const [enrichedPost] = await enrichPostsWithAuthors([post]);
  let comments = await enrichCommentsWithAuthors(rawComments);
  let myVote = null;

  if (viewer.userId) {
    const vote = await voteRepository.findUserVote(viewer.userId, 'post', post._id);
    myVote = vote ? vote.value : null;
    const commentVotes = await mapMyVotes(
      viewer.userId,
      'comment',
      comments.map((comment) => comment._id),
    );
    comments = presenter.withMyVotes(comments, commentVotes);
  }

  return { ...enrichedPost, comments, myVote };
}

async function trackPostView(postId) {
  const updated = await postRepository.incrementViewCount(postId);
  if (!updated) throw AppError.notFound(POST_NOT_FOUND);
  return updated.viewCount;
}

async function addComment({ postId, viewer, content: rawContent, parentId }) {
  const post = await postRepository.findById(postId);
  if (!post) throw AppError.notFound(POST_NOT_FOUND);
  if (post.isHidden) throw AppError.forbidden('Bài viết đã bị ẩn');

  const content = sanitizeDiscussionHtml(rawContent);
  if (isEffectivelyEmptyHtml(content)) {
    throw AppError.badRequest('Nội dung bình luận trống');
  }

  let parent = null;
  if (parentId) {
    parent = await commentRepository.findInPost(parentId, post._id);
    if (!parent) throw AppError.badRequest('Bình luận cha không hợp lệ');
  }

  const comment = await commentRepository.create({
    postId: post._id,
    authorId: viewer.userId,
    authorName: viewer.displayName,
    content,
    parentId: parent?._id || null,
  });

  await postRepository.incrementCommentCount(post._id);
  notifyAboutComment({ post, parent, viewer, content });

  const [enriched] = await enrichCommentsWithAuthors([comment.toObject()]);
  return enriched;
}

/**
 * Trả lời báo cho chủ bình luận cha, và cho chủ bài nếu đó là người khác —
 * không ai nhận thông báo về hành động của chính mình.
 */
function notifyAboutComment({ post, parent, viewer, content }) {
  const payload = {
    postId: String(post._id),
    postTitle: post.title,
    commenterName: viewer.notifyName,
    commentPreview: content,
  };
  const isSelf = (id) => !id || String(id) === String(viewer.userId);

  if (parent) {
    if (!isSelf(parent.authorId)) {
      void notifyCommunityReply({ userId: String(parent.authorId), ...payload });
    }
    if (!isSelf(post.authorId) && String(post.authorId) !== String(parent.authorId)) {
      void notifyCommunityCommentOnPost({ userId: String(post.authorId), ...payload });
    }
    return;
  }

  if (!isSelf(post.authorId)) {
    void notifyCommunityCommentOnPost({ userId: String(post.authorId), ...payload });
  }
}

async function votePost({ postId, viewer, value }) {
  const post = await postRepository.findById(postId);
  if (!post) throw AppError.notFound(POST_NOT_FOUND);

  const { delta, myVote } = await applyVote({
    targetType: 'post',
    targetId: post._id,
    userId: viewer.userId,
    value,
    authorId: post.authorId,
    voterName: viewer.voterName,
    postId: String(post._id),
    postTitle: post.title,
  });

  const updated = await postRepository.incrementVoteCount(post._id, delta);
  return { voteCount: updated.voteCount, myVote };
}

async function setPostPinned({ postId, viewer, isPinned }) {
  assertCanModerate(viewer);
  const post = await postRepository.findById(postId);
  if (!post) throw AppError.notFound(POST_NOT_FOUND);
  if (typeof isPinned !== 'boolean') return post;
  return postRepository.setPinned(post._id, isPinned);
}

async function deletePost({ postId, viewer }) {
  assertCanModerate(viewer);
  const post = await postRepository.findById(postId);
  if (!post) throw AppError.notFound(POST_NOT_FOUND);

  await commentRepository.deleteForPost(post._id);
  await voteRepository.deleteForTarget('post', post._id);
  await postRepository.deleteById(post._id);
  await forumRepository.incrementPostCount(post.forumId, -1);
}

module.exports = {
  getPostDetail,
  trackPostView,
  addComment,
  votePost,
  setPostPinned,
  deletePost,
};
