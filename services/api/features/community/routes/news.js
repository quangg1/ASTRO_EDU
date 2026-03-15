const express = require('express');
const Forum = require('../models/Forum');
const Post = require('../models/Post');
const { optionalAuth } = require('../../../shared/jwtAuth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    let forum = await Forum.findOne({ slug: 'tin-thien-van' });
    if (!forum) {
      forum = await Forum.findOne({ isNews: true });
    }
    if (!forum) {
      return res.json({ success: true, data: [], total: 0, message: 'Chưa có tin thiên văn. Chạy: npm run crawl-news' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10) || 20);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20);

    const posts = await Post.find({ forumId: forum._id, isCrawled: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Post.countDocuments({ forumId: forum._id, isCrawled: true });
    res.json({ success: true, data: posts, total, page: parseInt(page, 10), limit: limitNum });
  } catch (err) {
    console.error('List news error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
