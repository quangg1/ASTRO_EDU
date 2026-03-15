const express = require('express');
const Forum = require('../models/Forum');
const Post = require('../models/Post');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const forums = await Forum.find().sort({ order: 1, title: 1 }).lean();
    res.json({ success: true, data: forums });
  } catch (err) {
    console.error('List forums error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const forum = await Forum.findOne({ slug: req.params.slug }).lean();
    if (!forum) return res.status(404).json({ success: false, error: 'Không tìm thấy diễn đàn' });
    res.json({ success: true, data: forum });
  } catch (err) {
    console.error('Get forum error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/:slug/posts', optionalAuth, async (req, res) => {
  try {
    const forum = await Forum.findOne({ slug: req.params.slug });
    if (!forum) return res.status(404).json({ success: false, error: 'Không tìm thấy diễn đàn' });

    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10) || 20);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20);

    let sortOpt = { isPinned: -1, createdAt: -1 };
    if (sort === 'top') sortOpt = { isPinned: -1, voteCount: -1, createdAt: -1 };
    if (sort === 'hot') sortOpt = { isPinned: -1, commentCount: -1, voteCount: -1, createdAt: -1 };

    const posts = await Post.find({ forumId: forum._id })
      .sort(sortOpt)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Post.countDocuments({ forumId: forum._id });
    res.json({ success: true, data: posts, total, page: parseInt(page, 10), limit: limitNum });
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:slug/posts', authMiddleware, async (req, res) => {
  try {
    const forum = await Forum.findOne({ slug: req.params.slug });
    if (!forum) return res.status(404).json({ success: false, error: 'Không tìm thấy diễn đàn' });

    const { title, content, courseId, courseSlug, lessonSlug } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'Thiếu tiêu đề' });

    const post = await Post.create({
      forumId: forum._id,
      authorId: req.userId,
      authorName: req.user?.displayName || req.user?.email || 'User',
      title: title.trim(),
      content: (content || '').trim(),
      courseId: courseId || null,
      courseSlug: courseSlug || null,
      lessonSlug: lessonSlug || null,
    });

    await Forum.findByIdAndUpdate(forum._id, { $inc: { postCount: 1 } });
    res.status(201).json({ success: true, data: post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
