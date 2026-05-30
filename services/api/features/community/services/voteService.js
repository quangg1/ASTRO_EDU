const Vote = require('../models/Vote');
const {
  notifyCommunityPostUpvote,
  notifyCommunityCommentUpvote,
} = require('../../notifications/services/notificationService');

/**
 * Toggle/create vote. Returns delta for $inc on voteCount and resulting myVote.
 * @param {{ targetType: 'post'|'comment', targetId: import('mongoose').Types.ObjectId, userId: string, value: 1|-1, authorId?: string|null, voterName?: string, postId?: string, postTitle?: string }}
 */
async function applyVote({
  targetType,
  targetId,
  userId,
  value,
  authorId,
  voterName,
  postId,
  postTitle,
}) {
  const existing = await Vote.findOne({
    userId,
    targetType,
    targetId,
  });

  let delta = value;
  let myVote = value;
  let shouldNotifyUpvote = false;

  if (existing) {
    if (existing.value === value) {
      await Vote.deleteOne({ _id: existing._id });
      delta = -value;
      myVote = null;
    } else {
      await Vote.updateOne({ _id: existing._id }, { $set: { value } });
      delta = value * 2;
      myVote = value;
      if (value === 1 && existing.value !== 1) shouldNotifyUpvote = true;
    }
  } else {
    await Vote.create({
      userId,
      targetType,
      targetId,
      value,
    });
    if (value === 1) shouldNotifyUpvote = true;
  }

  if (
    shouldNotifyUpvote &&
    authorId &&
    String(authorId) !== String(userId) &&
    postId
  ) {
    const payload = {
      userId: String(authorId),
      voterName: voterName || 'Ai đó',
      postId: String(postId),
      postTitle: postTitle || '',
    };
    if (targetType === 'post') {
      void notifyCommunityPostUpvote(payload);
    } else {
      void notifyCommunityCommentUpvote(payload);
    }
  }

  return { delta, myVote, shouldNotifyUpvote };
}

/**
 * @param {string} userId
 * @param {'post'|'comment'} targetType
 * @param {import('mongoose').Types.ObjectId[]} targetIds
 */
async function mapMyVotes(userId, targetType, targetIds) {
  if (!userId || !targetIds.length) return {};
  const votes = await Vote.find({
    userId,
    targetType,
    targetId: { $in: targetIds },
  }).lean();
  return Object.fromEntries(votes.map((v) => [String(v.targetId), v.value]));
}

module.exports = { applyVote, mapMyVotes };
