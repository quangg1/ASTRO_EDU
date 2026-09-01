/**
 * API đọc cộng đồng cho agent / profile / RAG — feature khác không chạm models/.
 */
const mongoose = require('mongoose');
const { postRepository, commentRepository, forumRepository } = require('../repositories');
const { isNewsForum } = require('../constants/forumCatalog');

function toObjectIds(ids) {
  return (ids || [])
    .map((id) => String(id || '').trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

async function listAllForums() {
  return forumRepository.listAll();
}

/**
 * @param {string[]} ids
 */
async function listVisiblePostsByIds(ids) {
  const objectIds = toObjectIds(ids);
  if (!objectIds.length) return [];
  return postRepository.findMany({
    _id: { $in: objectIds },
    isHidden: { $ne: true },
  });
}

/**
 * Top thảo luận (không tin RSS) kèm forumSlug — agent thread lookup.
 */
async function listTopDiscussionThreads({
  limit = 3,
  lessonSlug,
  lessonId,
  courseSlug,
} = {}) {
  const forums = await forumRepository.listAll();
  const discussionIds = forums.filter((f) => !isNewsForum(f)).map((f) => f._id);
  if (!discussionIds.length) return [];

  const filter = {
    forumId: { $in: discussionIds },
    isHidden: { $ne: true },
  };
  if (lessonSlug) filter.lessonSlug = lessonSlug;
  if (lessonId) filter.learningLessonId = lessonId;
  if (courseSlug) filter.courseSlug = courseSlug;

  const posts = await postRepository.findMany(filter, {
    sort: { voteCount: -1, commentCount: -1, createdAt: -1 },
    limit: Math.min(5, Math.max(1, limit)),
  });
  const forumById = new Map(forums.map((f) => [String(f._id), f]));

  return posts.map((p) => {
    const forum = forumById.get(String(p.forumId));
    return {
      postId: String(p._id),
      title: p.title,
      forumSlug: forum?.slug || 'hoi-dap-hoc-tap',
      href: `/community/post/${p._id}`,
      voteCount: p.voteCount ?? 0,
      commentCount: p.commentCount ?? 0,
      contextTitle: p.contextTitle || null,
      content: p.content,
    };
  });
}

/**
 * Posts cho rebuild RAG: thảo luận (top vote) + tin (mới nhất).
 */
async function listPostsForRagIndex({ discussionLimit = 500, newsLimit = 300 } = {}) {
  const forums = await forumRepository.listAll();
  const discussionIds = forums.filter((f) => !isNewsForum(f)).map((f) => f._id);
  const newsIds = forums.filter((f) => isNewsForum(f)).map((f) => f._id);

  const [discussionPosts, newsPosts] = await Promise.all([
    discussionIds.length
      ? postRepository.findMany(
          { forumId: { $in: discussionIds }, isHidden: { $ne: true } },
          {
            sort: { voteCount: -1, commentCount: -1, createdAt: -1 },
            limit: discussionLimit,
          },
        )
      : Promise.resolve([]),
    newsIds.length
      ? postRepository.findMany(
          { forumId: { $in: newsIds }, isHidden: { $ne: true } },
          {
            sort: { publishedAt: -1, createdAt: -1 },
            limit: newsLimit,
          },
        )
      : Promise.resolve([]),
  ]);

  return {
    discussionPosts,
    newsPosts,
    posts: [...discussionPosts, ...newsPosts],
  };
}

function countPostsByAuthor(authorId) {
  if (!authorId) return Promise.resolve(0);
  return postRepository.count({ authorId: String(authorId) });
}

function countCommentsByAuthor(authorId) {
  if (!authorId) return Promise.resolve(0);
  return commentRepository.count({ authorId: String(authorId) });
}

module.exports = {
  listAllForums,
  listVisiblePostsByIds,
  listTopDiscussionThreads,
  listPostsForRagIndex,
  countPostsByAuthor,
  countCommentsByAuthor,
};
