const { escapeRegex } = require('../../../shared/escapeRegex');
const { isNewsForum } = require('../constants/forumCatalog');

const MIN_QUERY_LEN = 2;

function normalizeQueryString(q) {
  const s = typeof q === 'string' ? q.trim() : '';
  return s.length >= MIN_QUERY_LEN ? s : '';
}

/**
 * Filter danh sách bài theo loại forum — tin vs thảo luận tách logic chuyên biệt.
 */
function buildForumPostFilter(forum, query = {}, viewerRole = null) {
  const base = { forumId: forum._id };
  const { publicVisibilityFilter } = require('./moderationAccess');
  const vis = publicVisibilityFilter(viewerRole);
  if (vis.isHidden) {
    base.isHidden = vis.isHidden;
  }
  const qStr = normalizeQueryString(query.q);
  const cat = typeof query.category === 'string' ? query.category.trim() : '';
  const tag = typeof query.tag === 'string' ? query.tag.trim().toLowerCase() : '';
  const courseSlug = typeof query.courseSlug === 'string' ? query.courseSlug.trim() : '';
  const lessonSlug = typeof query.lessonSlug === 'string' ? query.lessonSlug.trim() : '';
  const pathSource = typeof query.pathSource === 'string' ? query.pathSource.trim() : '';
  const learningLessonId =
    typeof query.learningLessonId === 'string' ? query.learningLessonId.trim() : '';

  const extra = [];

  if (isNewsForum(forum)) {
    if (cat) {
      extra.push({ rssCategories: new RegExp(`^${escapeRegex(cat)}$`, 'i') });
    }
    if (qStr) {
      extra.push({ title: new RegExp(escapeRegex(qStr), 'i') });
    }
  } else {
    if (tag) {
      extra.push({ tags: tag });
    }
    if (pathSource === 'course' || pathSource === 'learning-path') {
      extra.push({ pathSource });
    }
    if (courseSlug) {
      extra.push({ courseSlug });
    }
    if (lessonSlug) {
      extra.push({ lessonSlug });
    }
    if (learningLessonId) {
      extra.push({ learningLessonId });
    }
    if (qStr) {
      const re = new RegExp(escapeRegex(qStr), 'i');
      extra.push({ $or: [{ title: re }, { content: re }] });
    }
  }

  if (extra.length === 0) return base;
  if (extra.length === 1) return { ...base, ...extra[0] };
  return { ...base, $and: extra };
}

/**
 * Tìm toàn cộng đồng — scope: news | discussion | all
 */
function buildGlobalSearchFilter({ forumIds, scope, q, tag, category, viewerRole = null }) {
  const qStr = normalizeQueryString(q);
  const cat = typeof category === 'string' ? category.trim() : '';
  const tagNorm = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
  const { publicVisibilityFilter } = require('./moderationAccess');

  const filter = { forumId: { $in: forumIds }, ...publicVisibilityFilter(viewerRole) };
  const extra = [];

  if (scope === 'news') {
    if (cat) extra.push({ rssCategories: new RegExp(`^${escapeRegex(cat)}$`, 'i') });
    if (qStr) extra.push({ title: new RegExp(escapeRegex(qStr), 'i') });
  } else if (scope === 'discussion') {
    if (tagNorm) extra.push({ tags: tagNorm });
    if (qStr) {
      const re = new RegExp(escapeRegex(qStr), 'i');
      extra.push({ $or: [{ title: re }, { content: re }] });
    }
  } else {
    if (tagNorm) extra.push({ tags: tagNorm });
    if (cat) extra.push({ rssCategories: new RegExp(`^${escapeRegex(cat)}$`, 'i') });
    if (qStr) {
      const re = new RegExp(escapeRegex(qStr), 'i');
      extra.push({ $or: [{ title: re }, { content: re }] });
    }
  }

  if (extra.length === 0) return filter;
  if (extra.length === 1) return { ...filter, ...extra[0] };
  return { ...filter, $and: extra };
}

module.exports = {
  MIN_QUERY_LEN,
  normalizeQueryString,
  buildForumPostFilter,
  buildGlobalSearchFilter,
};
