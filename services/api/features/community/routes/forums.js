const express = require('express');
const Forum = require('../models/Forum');
const Post = require('../models/Post');
const { findPostsHot } = require('../postSort');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');
const { enrichPostsWithAuthors } = require('../../users/publicProfileService');
const { isNewsForum } = require('../constants/forumCatalog');
const { buildForumPostFilter } = require('../lib/postListQuery');
const { mergePostTags } = require('../lib/postTags');

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
    res.json({
      success: true,
      data: { ...forum, isNews: isNewsForum(forum) },
    });
  } catch (err) {
    console.error('Get forum error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/:slug/posts', optionalAuth, async (req, res) => {
  try {
    const forum = await Forum.findOne({ slug: req.params.slug }).lean();
    if (!forum) return res.status(404).json({ success: false, error: 'Không tìm thấy diễn đàn' });

    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10) || 20);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20);

    let sortOpt = { isPinned: -1, createdAt: -1 };
    if (sort === 'top') sortOpt = { isPinned: -1, voteCount: -1, createdAt: -1 };

    const filter = buildForumPostFilter(forum, req.query, req.userRole);

    const posts =
      sort === 'hot'
        ? await findPostsHot(filter, skip, limitNum)
        : await Post.find(filter).sort(sortOpt).skip(skip).limit(limitNum).lean();

    const total = await Post.countDocuments(filter);
    const data = await enrichPostsWithAuthors(posts);
    res.json({ success: true, data, total, page: parseInt(page, 10), limit: limitNum });
  } catch (err) {
    console.error('List posts error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:slug/posts', authMiddleware, async (req, res) => {
  try {
    const forum = await Forum.findOne({ slug: req.params.slug });
    if (!forum) return res.status(404).json({ success: false, error: 'Không tìm thấy diễn đàn' });
    if (isNewsForum(forum)) {
      return res.status(400).json({ success: false, error: 'Không thể đăng bài vào kênh tin tổng hợp' });
    }

    const {
      title,
      content,
      courseId,
      courseSlug,
      lessonSlug,
      pathSource,
      contextTitle,
      learningModuleId,
      learningNodeId,
      learningLessonId,
      tags,
    } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'Thiếu tiêu đề' });

    const mergedTags = mergePostTags({
      explicitTags: tags,
      title: title.trim(),
      content: (content || '').trim(),
    });

    const post = await Post.create({
      forumId: forum._id,
      authorId: req.userId,
      authorName: req.user?.displayName || req.user?.email || 'User',
      title: title.trim(),
      content: (content || '').trim(),
      courseId: courseId || null,
      courseSlug: courseSlug || null,
      lessonSlug: lessonSlug || null,
      pathSource: pathSource === 'course' || pathSource === 'learning-path' ? pathSource : null,
      contextTitle: typeof contextTitle === 'string' ? contextTitle.trim().slice(0, 500) || null : null,
      learningModuleId: learningModuleId || null,
      learningNodeId: learningNodeId || null,
      learningLessonId: learningLessonId || null,
      tags: mergedTags,
    });

    await Forum.findByIdAndUpdate(forum._id, { $inc: { postCount: 1 } });
    const [enriched] = await enrichPostsWithAuthors([post.toObject ? post.toObject() : post]);
    res.status(201).json({ success: true, data: enriched });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
