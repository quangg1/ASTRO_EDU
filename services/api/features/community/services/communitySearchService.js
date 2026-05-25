const Forum = require('../models/Forum');
const Post = require('../models/Post');
const { isNewsForum } = require('../constants/forumCatalog');
const { buildGlobalSearchFilter, normalizeQueryString } = require('../lib/postListQuery');
const { enrichPostsWithAuthors } = require('../../users/publicProfileService');
const { findPostsHot } = require('../postSort');

async function resolveForumScope(scope) {
  const forums = await Forum.find().lean();
  if (scope === 'news') {
    return forums.filter((f) => isNewsForum(f));
  }
  if (scope === 'discussion') {
    return forums.filter((f) => !isNewsForum(f));
  }
  return forums;
}

async function searchCommunityPosts({
  q,
  scope = 'all',
  forumSlug,
  tag,
  category,
  sort = 'newest',
  page = 1,
  limit = 20,
  viewerRole = null,
}) {
  let forums = await resolveForumScope(scope);
  if (forumSlug) {
    forums = forums.filter((f) => f.slug === forumSlug);
  }
  if (!forums.length) {
    return { data: [], total: 0, page, limit };
  }

  const forumIds = forums.map((f) => f._id);
  const qStr = normalizeQueryString(q);
  const tagNorm = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
  const cat = typeof category === 'string' ? category.trim() : '';

  if (!qStr && !tagNorm && !cat) {
    return { data: [], total: 0, page, limit, needsQuery: true };
  }

  const filter = buildGlobalSearchFilter({
    forumIds,
    scope: forumSlug && forums[0] && isNewsForum(forums[0]) ? 'news' : forumSlug ? 'discussion' : scope,
    q,
    tag,
    category,
    viewerRole,
  });

  const skip = (Math.max(1, page) - 1) * Math.min(50, limit);
  const limitNum = Math.min(50, limit);

  let sortOpt = { isPinned: -1, createdAt: -1 };
  if (sort === 'top') sortOpt = { isPinned: -1, voteCount: -1, createdAt: -1 };

  const posts =
    sort === 'hot'
      ? await findPostsHot(filter, skip, limitNum)
      : await Post.find(filter).sort(sortOpt).skip(skip).limit(limitNum).lean();

  const total = await Post.countDocuments(filter);
  const data = await enrichPostsWithAuthors(posts);

  const forumById = new Map(forums.map((f) => [String(f._id), f]));
  const withForum = data.map((p) => {
    const f = forumById.get(String(p.forumId));
    return {
      ...p,
      forumSlug: f?.slug || null,
      forumTitle: f?.title || null,
      forumIsNews: f ? isNewsForum(f) : false,
    };
  });

  return { data: withForum, total, page, limit: limitNum };
}

async function listPopularTags({ limit = 30 } = {}) {
  const discussionForums = await Forum.find({ isNews: { $ne: true } }).select('_id').lean();
  const ids = discussionForums.map((f) => f._id);
  if (!ids.length) return [];

  const tags = await Post.aggregate([
    { $match: { forumId: { $in: ids }, tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: Math.min(50, limit) },
  ]);

  return tags.map((t) => ({ tag: t._id, count: t.count }));
}

module.exports = {
  searchCommunityPosts,
  listPopularTags,
};
