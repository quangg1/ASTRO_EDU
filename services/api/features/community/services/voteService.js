const voteRepository = require('../repositories/voteRepository');
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
  const existing = await voteRepository.findUserVote(userId, targetType, targetId);

  let delta = value;
  let myVote = value;
  let shouldNotifyUpvote = false;

  if (existing) {
    if (existing.value === value) {
      // Bấm lại cùng chiều = rút phiếu.
      await voteRepository.deleteById(existing._id);
      delta = -value;
      myVote = null;
    } else {
      await voteRepository.setValue(existing._id, value);
      delta = value * 2;
      myVote = value;
      if (value === 1) shouldNotifyUpvote = true;
    }
  } else {
    await voteRepository.create({ userId, targetType, targetId, value });
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
  const votes = await voteRepository.listUserVotes(userId, targetType, targetIds);
  return Object.fromEntries(votes.map((vote) => [String(vote.targetId), vote.value]));
}

module.exports = { applyVote, mapMyVotes };
