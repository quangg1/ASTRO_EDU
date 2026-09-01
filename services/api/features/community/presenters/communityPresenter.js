const { isNewsForum } = require('../constants/forumCatalog');

function forumDetail(forum) {
  return { ...forum, isNews: isNewsForum(forum) };
}

/** Gắn lá phiếu của chính người xem vào từng bài — null nếu chưa vote. */
function withMyVotes(rows, voteMap) {
  if (!voteMap) return rows;
  return rows.map((row) => ({ ...row, myVote: voteMap[String(row._id)] ?? null }));
}

/**
 * Danh sách trải rộng nhiều forum cần kèm nhãn forum để client khỏi gọi thêm.
 */
function withForumMeta(posts, forums) {
  const forumById = new Map(forums.map((forum) => [String(forum._id), forum]));
  return posts.map((post) => {
    const forum = forumById.get(String(post.forumId));
    return {
      ...post,
      forumSlug: forum?.slug || null,
      forumTitle: forum?.title || null,
      forumIsNews: forum ? isNewsForum(forum) : false,
    };
  });
}

module.exports = { forumDetail, withMyVotes, withForumMeta };
