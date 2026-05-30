const express = require('express');
const Forum = require('../models/Forum');
const Post = require('../models/Post');
const { findPostsHot } = require('../postSort');
const { optionalAuth } = require('../../../shared/jwtAuth');
const { NEWS_FORUM_SLUG } = require('../constants/forumCatalog');
const { buildForumPostFilter } = require('../lib/postListQuery');

const router = express.Router();

async function getNewsForum() {
  let forum = await Forum.findOne({ slug: NEWS_FORUM_SLUG });
  if (!forum) forum = await Forum.findOne({ isNews: true });
  return forum;
}

function buildNewsFilterQuery(forum, reqQuery) {
  const base = buildForumPostFilter(forum, reqQuery);
  return { ...base, isCrawled: true };
}

/** Danh sách category đã có trong DB (để làm chip filter). */
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const forum = await getNewsForum();
    if (!forum) {
      return res.json({ success: true, data: [] });
    }
    const raw = await Post.distinct('rssCategories', {
      forumId: forum._id,
      isCrawled: true,
      rssCategories: { $exists: true, $ne: [] },
    });
    const flat = raw.filter(Boolean).sort((a, b) => a.localeCompare(b, 'en'));
    res.json({ success: true, data: flat });
  } catch (err) {
    console.error('News categories error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/', optionalAuth, async (req, res) => {
  try {
    const forum = await getNewsForum();
    if (!forum) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'Chưa có tin thiên văn. Chạy: npm run crawl-news',
      });
    }

    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10) || 20);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20);

    const filter = buildNewsFilterQuery(forum, req.query);

    let sortOpt = { isPinned: -1, publishedAt: -1, createdAt: -1 };
    if (sort === 'top') sortOpt = { isPinned: -1, voteCount: -1, publishedAt: -1, createdAt: -1 };

    const posts =
      sort === 'hot'
        ? await findPostsHot(filter, skip, limitNum)
        : await Post.find(filter)
            .sort(sortOpt)
            .skip(skip)
            .limit(limitNum)
            .lean();

    const total = await Post.countDocuments(filter);
    res.json({ success: true, data: posts, total, page: parseInt(page, 10), limit: limitNum });
  } catch (err) {
    console.error('List news error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
