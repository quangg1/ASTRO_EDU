const express = require('express');
const Forum = require('../models/Forum');
const Post = require('../models/Post');
const { findPostsHot } = require('../postSort');
const { optionalAuth } = require('../../../shared/jwtAuth');
const { escapeRegex } = require('../../../shared/escapeRegex');

const router = express.Router();

async function getNewsForum() {
  let forum = await Forum.findOne({ slug: 'tin-thien-van' });
  if (!forum) forum = await Forum.findOne({ isNews: true });
  return forum;
}

/** Query filter: ?category=… (khớp một phần tử rssCategories), ?q=… (tìm trong tiêu đề). */
function buildNewsFilterQuery(forumId, reqQuery) {
  const base = { forumId, isCrawled: true };
  const category = typeof reqQuery.category === 'string' ? reqQuery.category.trim() : '';
  const q = typeof reqQuery.q === 'string' ? reqQuery.q.trim() : '';
  const conds = [];

  if (category) {
    conds.push({
      rssCategories: new RegExp(`^${escapeRegex(category)}$`, 'i'),
    });
  }
  if (q.length >= 2) {
    conds.push({ title: new RegExp(escapeRegex(q), 'i') });
  }

  if (conds.length === 0) return base;
  if (conds.length === 1) return { ...base, ...conds[0] };
  return { ...base, $and: conds };
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

    const filter = buildNewsFilterQuery(forum._id, req.query);

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
