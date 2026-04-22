const Post = require('./models/Post');

const INTERACTION_ADD_FIELDS = {
  $addFields: {
    interactionScore: {
      $add: [
        { $ifNull: ['$viewCount', 0] },
        { $multiply: [{ $ifNull: ['$commentCount', 0] }, 2] },
        { $multiply: [{ $ifNull: ['$voteCount', 0] }, 3] },
      ],
    },
  },
};

/**
 * Tin “hot”: ghim trước, sau đó theo điểm tương tác (xem + 2×bình luận + 3×vote), rồi thời gian.
 */
async function findPostsHot(match, skip, limit) {
  return Post.aggregate([
    { $match: match },
    INTERACTION_ADD_FIELDS,
    {
      $sort: {
        isPinned: -1,
        interactionScore: -1,
        publishedAt: -1,
        createdAt: -1,
      },
    },
    { $skip: skip },
    { $limit: limit },
    { $project: { interactionScore: 0 } },
  ]);
}

module.exports = { findPostsHot };
