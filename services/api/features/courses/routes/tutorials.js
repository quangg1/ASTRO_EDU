const express = require('express');
const { Tutorial, TutorialCategory } = require('../models/Tutorial');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const cats = await TutorialCategory.find().sort({ order: 1 }).lean();
    res.json({ success: true, data: cats });
  } catch (err) {
    console.error('List tutorial categories error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { categoryId, q: searchQ } = req.query;
    const q = { published: true };
    if (categoryId) q.categoryId = categoryId;
    if (searchQ && typeof searchQ === 'string' && searchQ.trim()) {
      const regex = new RegExp(searchQ.trim(), 'i');
      q.$or = [
        { title: regex },
        { summary: regex },
        { tags: regex },
      ];
    }
    const list = await Tutorial.find(q)
      .sort({ order: 1, createdAt: -1 })
      .select('title slug summary categoryId readTime tags')
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('List tutorials error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/editor/all', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const list = await Tutorial.find().sort({ order: 1, createdAt: -1 }).lean();
    const categories = await TutorialCategory.find().sort({ order: 1 }).lean();
    res.json({ success: true, data: { tutorials: list, categories } });
  } catch (err) {
    console.error('Editor list tutorials error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/editor/:slug', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const t = await Tutorial.findOne({ slug: req.params.slug }).lean();
    if (!t) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    const categories = await TutorialCategory.find().sort({ order: 1 }).lean();
    res.json({ success: true, data: { tutorial: t, categories } });
  } catch (err) {
    console.error('Editor get tutorial error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, slug, summary, categoryId, readTime, tags, sections, relatedSlugs, published } = req.body || {};
    if (!title || !slug) {
      return res.status(400).json({ success: false, error: 'Thiếu title hoặc slug' });
    }
    const exist = await Tutorial.findOne({ slug });
    if (exist) return res.status(400).json({ success: false, error: 'Slug đã tồn tại' });
    const t = await Tutorial.create({
      title,
      slug,
      summary: summary || '',
      categoryId: categoryId || null,
      readTime: readTime ?? 5,
      tags: Array.isArray(tags) ? tags : [],
      sections: Array.isArray(sections) ? sections : [],
      relatedSlugs: Array.isArray(relatedSlugs) ? relatedSlugs : [],
      published: !!published,
    });
    res.status(201).json({ success: true, data: t });
  } catch (err) {
    console.error('Create tutorial error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const t = await Tutorial.findOne({ slug: req.params.slug, published: true }).lean();
    if (!t) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    }
    let category = null;
    if (t.categoryId) {
      category = await TutorialCategory.findById(t.categoryId).lean();
    }
    res.json({
      success: true,
      data: {
        ...t,
        category: category ? { id: category._id, title: category.title, slug: category.slug } : null,
      },
    });
  } catch (err) {
    console.error('Get tutorial error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.put('/editor/:slug', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const t = await Tutorial.findOne({ slug: req.params.slug });
    if (!t) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    const { title, summary, categoryId, readTime, tags, sections, relatedSlugs, published } = req.body || {};
    if (typeof title === 'string' && title.trim()) t.title = title.trim();
    if (typeof summary === 'string') t.summary = summary;
    if (categoryId !== undefined) t.categoryId = categoryId || null;
    if (readTime != null) t.readTime = Number(readTime) || 5;
    if (Array.isArray(tags)) t.tags = tags;
    if (Array.isArray(sections)) t.sections = sections;
    if (Array.isArray(relatedSlugs)) t.relatedSlugs = relatedSlugs;
    if (typeof published === 'boolean') t.published = published;
    await t.save();
    res.json({ success: true, data: t });
  } catch (err) {
    console.error('Update tutorial error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.delete('/editor/:slug', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const t = await Tutorial.findOneAndDelete({ slug: req.params.slug });
    if (!t) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete tutorial error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
