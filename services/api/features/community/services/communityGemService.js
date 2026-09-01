const postRepository = require('../repositories/postRepository');
const forumRepository = require('../repositories/forumRepository');
const { isNewsForum } = require('../constants/forumCatalog');
const {
  GEM_EARN,
  COMMUNITY_CAP,
  COMMUNITY_POST_MIN_CHARS,
  COMMUNITY_POST_COOLDOWN_MS,
  COMMUNITY_EARN_REASONS,
} = require('../../rewards/constants/gemEarn');
const { getCachedSeasonalMultiplier, scaleEarn } = require('../../rewards/services/gemRuntimeConfigService');
const { applyGemEarn } = require('../../rewards/services/rewardEngine');
const gemLedger = require('../../rewards/services/gemLedgerService');

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainPostLength(title, content) {
  return stripHtml(title).length + stripHtml(content).length;
}

function normalizeTitle(title) {
  return stripHtml(title).toLowerCase();
}

function isTrustedHelpfulMarker(role) {
  return role === 'moderator' || role === 'admin' || role === 'teacher';
}

/**
 * Ai được đánh dấu bình luận hữu ích: tác giả bài, mod/admin/teacher.
 */
function canMarkCommentHelpful({ markerId, markerRole, postAuthorId, commentAuthorId, canModTools }) {
  if (!markerId || !commentAuthorId) return false;
  if (String(markerId) === String(commentAuthorId)) return false;
  if (canModTools || isTrustedHelpfulMarker(markerRole)) return true;
  if (postAuthorId && String(markerId) === String(postAuthorId)) return true;
  return false;
}

/**
 * Chỉ thưởng gem khi marker đáng tin (mod/admin/teacher) hoặc tác giả bài (không phải tác giả comment).
 */
function helpfulMarkTriggersGem({ markerId, markerRole, postAuthorId, commentAuthorId, canModTools }) {
  if (String(markerId) === String(commentAuthorId)) return false;
  if (canModTools || isTrustedHelpfulMarker(markerRole)) return true;
  if (postAuthorId && String(markerId) === String(postAuthorId)) return true;
  return false;
}

async function isDiscussionPost(postId) {
  const post = await postRepository.findById(postId, {
    projection: 'forumId isCrawled isExternalArticle isHidden reportCount',
  });
  if (!post || post.isHidden || post.isCrawled || post.isExternalArticle) return null;
  if ((post.reportCount || 0) > 0) return null;
  const forum = await forumRepository.findById(post.forumId);
  if (!forum || isNewsForum(forum)) return null;
  return { post, forum };
}

async function recentPostByUser(userId, excludePostId) {
  const filter = { authorId: userId };
  if (excludePostId) filter._id = { $ne: excludePostId };
  return postRepository.findOne(filter, {
    sort: { createdAt: -1 },
    projection: 'createdAt title',
  });
}

async function duplicateTitleRecently(userId, title, excludePostId) {
  const norm = normalizeTitle(title);
  if (!norm) return false;
  const since = new Date(Date.now() - 24 * 86400_000);
  const filter = {
    authorId: userId,
    createdAt: { $gte: since },
  };
  if (excludePostId) filter._id = { $ne: excludePostId };
  const recent = await postRepository.findMany(filter, { projection: 'title' });
  return recent.some((p) => normalizeTitle(p.title) === norm);
}

function buildGemResult(agg, gemsEarned, label) {
  if (!agg) return null;
  return {
    gemsEarned,
    newBalance: agg.updated?.gemBalance ?? 0,
    label,
  };
}

/**
 * Thưởng đăng bài thảo luận — gọi sau Post.create (fire-and-forget OK).
 * @returns {Promise<null|{ gemsEarned: number, newBalance: number, label: string }>}
 */
async function maybeRewardCommunityPost({ userId, post, forum }) {
  if (!userId || !post || !forum) return null;
  if (isNewsForum(forum)) return null;
  if (post.isCrawled || post.isExternalArticle || post.isHidden) return null;
  if ((post.reportCount || 0) > 0) return null;

  const len = plainPostLength(post.title, post.content);
  if (len < COMMUNITY_POST_MIN_CHARS) return null;

  if (await duplicateTitleRecently(userId, post.title, post._id)) return null;

  const last = await recentPostByUser(userId, post._id);
  if (last?.createdAt) {
    const elapsed = Date.now() - new Date(last.createdAt).getTime();
    if (elapsed < COMMUNITY_POST_COOLDOWN_MS) return null;
  }

  if (await gemLedger.hasEarnedToday({ userId, reason: 'community_post' })) return null;
  if (await gemLedger.hasEarnedFor({ userId, reason: 'community_post', entityId: post._id })) {
    return null;
  }

  const seasonalMult = await getCachedSeasonalMultiplier();
  const amt = scaleEarn(GEM_EARN.community_post, seasonalMult);
  if (amt <= 0) return null;

  const agg = await applyGemEarn(userId, amt, {
    reason: 'community_post',
    entityId: String(post._id),
    metadata: {
      forumSlug: forum.slug,
      postTitle: String(post.title || '').slice(0, 200),
      seasonalMultiplier: seasonalMult,
    },
  });

  return buildGemResult(agg, amt, 'Cộng đồng — đăng bài thảo luận');
}

/**
 * Thưởng bình luận được đánh dấu hữu ích.
 */
async function maybeRewardHelpfulAnswer({ comment, post, forum, markerId, markerRole, canModTools }) {
  if (!comment?.authorId || comment.isHelpful) return null;
  if (!helpfulMarkTriggersGem({
    markerId,
    markerRole,
    postAuthorId: post?.authorId,
    commentAuthorId: comment.authorId,
    canModTools,
  })) {
    return null;
  }

  const ctx = post?._id ? { post, forum } : await isDiscussionPost(comment.postId);
  if (!ctx) return null;

  const authorId = String(comment.authorId);
  const reason = 'community_helpful_answer';
  if (await gemLedger.hasEarnedFor({ userId: authorId, reason, entityId: comment._id })) return null;

  const weekCount = await gemLedger.countEarnedWithinDays({ userId: authorId, reason, days: 7 });
  if (weekCount >= COMMUNITY_CAP.helpfulAnswersPerWeek) return null;

  const seasonalMult = await getCachedSeasonalMultiplier();
  const amt = scaleEarn(GEM_EARN.community_helpful_answer, seasonalMult);
  if (amt <= 0) return null;

  const agg = await applyGemEarn(authorId, amt, {
    reason: 'community_helpful_answer',
    entityId: String(comment._id),
    metadata: {
      postId: String(comment.postId),
      markedBy: String(markerId),
      seasonalMultiplier: seasonalMult,
    },
  });

  return buildGemResult(agg, amt, 'Cộng đồng — câu trả lời hữu ích');
}

/**
 * Thưởng khi bình luận nhận upvote (không self-vote).
 */
async function maybeRewardCommentUpvote({ comment, post, forum, voterId }) {
  if (!comment?.authorId || !voterId) return null;
  if (String(comment.authorId) === String(voterId)) return null;
  if (comment.isHidden) return null;

  let resolvedPost = post;
  let resolvedForum = forum;
  if (!resolvedPost?._id) {
    const ctx = await isDiscussionPost(comment.postId);
    if (!ctx) return null;
    resolvedPost = ctx.post;
    resolvedForum = ctx.forum;
  } else if (!resolvedForum || isNewsForum(resolvedForum)) {
    return null;
  }

  const authorId = String(comment.authorId);
  const reason = 'community_helpful_vote';
  const alreadyRewarded = await gemLedger.hasEarnedFor({
    userId: authorId,
    reason,
    entityId: comment._id,
    metadata: { voterId },
  });
  if (alreadyRewarded) return null;

  const weekCount = await gemLedger.countEarnedWithinDays({ userId: authorId, reason, days: 7 });
  if (weekCount >= COMMUNITY_CAP.helpfulVotesPerWeek) return null;

  const seasonalMult = await getCachedSeasonalMultiplier();
  const amt = scaleEarn(GEM_EARN.community_helpful_vote, seasonalMult);
  if (amt <= 0) return null;

  const agg = await applyGemEarn(authorId, amt, {
    reason: 'community_helpful_vote',
    entityId: String(comment._id),
    metadata: {
      postId: String(comment.postId),
      voterId: String(voterId),
      seasonalMultiplier: seasonalMult,
    },
  });

  return buildGemResult(agg, amt, 'Cộng đồng — nhận upvote hữu ích');
}

module.exports = {
  stripHtml,
  plainPostLength,
  normalizeTitle,
  canMarkCommentHelpful,
  helpfulMarkTriggersGem,
  maybeRewardCommunityPost,
  maybeRewardHelpfulAnswer,
  maybeRewardCommentUpvote,
  COMMUNITY_EARN_REASONS,
};
