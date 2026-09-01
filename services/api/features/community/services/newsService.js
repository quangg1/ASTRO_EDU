const forumRepository = require('../repositories/forumRepository');
const postRepository = require('../repositories/postRepository');
const { buildForumPostFilter } = require('../lib/postListQuery');

const EMPTY_HINT = 'Chưa có tin thiên văn. Chạy: npm run crawl-news';

/** Chỉ bài crawl từ RSS mới là "tin" — bài người dùng viết không lọt vào đây. */
function newsFilter(forum, query) {
  return { ...buildForumPostFilter(forum, query), isCrawled: true };
}

async function listNewsCategories() {
  const forum = await forumRepository.findNewsForum();
  if (!forum) return [];
  const categories = await postRepository.listRssCategories(forum._id);
  return categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'en'));
}

async function listNews({ query }) {
  const forum = await forumRepository.findNewsForum();
  if (!forum) return { data: [], total: 0, message: EMPTY_HINT };

  const { page, limit, sort } = query;
  const filter = newsFilter(forum, query);

  const [data, total] = await Promise.all([
    postRepository.listPage(filter, { sort, skip: (page - 1) * limit, limit, news: true }),
    postRepository.count(filter),
  ]);

  return { data, total, page, limit };
}

module.exports = { listNewsCategories, listNews };
