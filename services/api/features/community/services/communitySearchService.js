const forumRepository = require('../repositories/forumRepository');
const postRepository = require('../repositories/postRepository');
const { isNewsForum } = require('../constants/forumCatalog');
const { buildGlobalSearchFilter, normalizeQueryString } = require('../lib/postListQuery');
const { enrichPostsWithAuthors } = require('../../users/publicProfileService');
const presenter = require('../presenters/communityPresenter');

const MAX_PAGE_SIZE = 50;

async function resolveForumScope(scope) {
  const forums = await forumRepository.listAll();
  if (scope === 'news') return forums.filter(isNewsForum);
  if (scope === 'discussion') return forums.filter((forum) => !isNewsForum(forum));
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
  viewerDoc = null,
}) {
  let forums = await resolveForumScope(scope);
  if (forumSlug) {
    forums = forums.filter((forum) => forum.slug === forumSlug);
  }
  if (!forums.length) {
    return { data: [], total: 0, page, limit };
  }

  const qStr = normalizeQueryString(q);
  const tagNorm = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
  const cat = typeof category === 'string' ? category.trim() : '';

  // Tìm kiếm không tiêu chí sẽ quét cả collection — bắt client gửi ít nhất một.
  if (!qStr && !tagNorm && !cat) {
    return { data: [], total: 0, page, limit, needsQuery: true };
  }

  const filter = buildGlobalSearchFilter({
    forumIds: forums.map((forum) => forum._id),
    // Khi đã khóa vào một forum, phạm vi được suy ra từ chính forum đó.
    scope: forumSlug ? (isNewsForum(forums[0]) ? 'news' : 'discussion') : scope,
    q,
    tag,
    category,
    viewerRole,
    viewerDoc,
  });

  const limitNum = Math.min(MAX_PAGE_SIZE, limit);
  const skip = (Math.max(1, page) - 1) * limitNum;

  const [posts, total] = await Promise.all([
    postRepository.listPage(filter, { sort, skip, limit: limitNum }),
    postRepository.count(filter),
  ]);

  const enriched = await enrichPostsWithAuthors(posts);
  return { data: presenter.withForumMeta(enriched, forums), total, page, limit: limitNum };
}

async function listPopularTags({ limit = 30 } = {}) {
  const forums = await forumRepository.listDiscussion({ projection: '_id' });
  if (!forums.length) return [];
  return postRepository.countTagUsage(
    forums.map((forum) => forum._id),
    Math.min(MAX_PAGE_SIZE, limit),
  );
}

async function listPostsByTag({ tag, page = 1, limit = 20, sort = 'newest' }) {
  const forums = await forumRepository.listDiscussion();
  const filter = { forumId: { $in: forums.map((forum) => forum._id) }, tags: tag };
  const limitNum = Math.min(MAX_PAGE_SIZE, limit);

  const [posts, total] = await Promise.all([
    postRepository.listPage(filter, { sort, skip: (Math.max(1, page) - 1) * limitNum, limit: limitNum }),
    postRepository.count(filter),
  ]);

  const enriched = await enrichPostsWithAuthors(posts);
  return { data: presenter.withForumMeta(enriched, forums), total, page, limit: limitNum, tag };
}

module.exports = { searchCommunityPosts, listPopularTags, listPostsByTag };
