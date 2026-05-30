const express = require('express');
const { optionalAuth } = require('../../../shared/jwtAuth');
const {
  searchCommunityPosts,
  listPopularTags,
} = require('../services/communitySearchService');
const { enrichPostsWithAuthors } = require('../../users/publicProfileService');
const Post = require('../models/Post');
const Forum = require('../models/Forum');
const { isNewsForum } = require('../constants/forumCatalog');
const { buildForumPostFilter } = require('../lib/postListQuery');
const { findPostsHot } = require('../postSort');

const moderationRouter = require('./moderation');

const router = express.Router();

router.use('/mod', moderationRouter);

/** Tìm bài — toàn cộng đồng hoặc theo scope (news | discussion). */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const scope = typeof req.query.scope === 'string' ? req.query.scope : 'all';
    const forumSlug = typeof req.query.forumSlug === 'string' ? req.query.forumSlug : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await searchCommunityPosts({
      q,
      scope,
      forumSlug: forumSlug || undefined,
      tag: tag || undefined,
      category: category || undefined,
      sort,
      page,
      limit,
      viewerRole: req.userRole,
      viewerDoc: req.userDoc,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('GET /community/search error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** Hashtag phổ biến (chỉ bài thảo luận). */
router.get('/tags', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const data = await listPopularTags({ limit });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /community/tags error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

/** Bài viết theo một hashtag. */
router.get('/tags/:tag/posts', async (req, res) => {
  try {
    const tag = String(req.params.tag || '')
      .trim()
      .toLowerCase()
      .replace(/^#/, '');
    if (!tag) return res.status(400).json({ success: false, error: 'Thiếu tag' });

    const forums = await Forum.find({ isNews: { $ne: true } }).lean();
    const forumIds = forums.map((f) => f._id);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip = (Math.max(1, page) - 1) * limit;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

    const filter = { forumId: { $in: forumIds }, tags: tag };
    let sortOpt = { isPinned: -1, createdAt: -1 };
    if (sort === 'top') sortOpt = { isPinned: -1, voteCount: -1, createdAt: -1 };

    const posts =
      sort === 'hot'
        ? await findPostsHot(filter, skip, limit)
        : await Post.find(filter).sort(sortOpt).skip(skip).limit(limit).lean();

    const total = await Post.countDocuments(filter);
    const data = await enrichPostsWithAuthors(posts);
    const forumById = new Map(forums.map((f) => [String(f._id), f]));
    const withForum = data.map((p) => {
      const f = forumById.get(String(p.forumId));
      return {
        ...p,
        forumSlug: f?.slug || null,
        forumTitle: f?.title || null,
        forumIsNews: false,
      };
    });

    res.json({ success: true, data: withForum, total, page, limit, tag });
  } catch (err) {
    console.error('GET /community/tags/:tag/posts error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
