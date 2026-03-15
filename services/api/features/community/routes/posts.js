const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');

const router = express.Router();

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });

    await Post.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    post.viewCount = (post.viewCount || 0) + 1;

    const comments = await Comment.find({ postId: post._id })
      .sort({ createdAt: 1 })
      .lean();

    let myVote = null;
    if (req.userId) {
      const v = await Vote.findOne({ userId: req.userId, targetType: 'post', targetId: post._id });
      if (v) myVote = v.value;
    }

    res.json({
      success: true,
      data: { ...post, comments, myVote },
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });

    const { content, parentId } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Thiếu nội dung' });

    const comment = await Comment.create({
      postId: post._id,
      authorId: req.userId,
      authorName: req.user?.displayName || req.user?.email || 'User',
      content: content.trim(),
      parentId: parentId || null,
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });

    const value = req.body?.value;
    if (value !== 1 && value !== -1) return res.status(400).json({ success: false, error: 'value phải là 1 hoặc -1' });

    const existing = await Vote.findOne({
      userId: req.userId,
      targetType: 'post',
      targetId: post._id,
    });

    let delta = value;
    if (existing) {
      if (existing.value === value) {
        await Vote.deleteOne({ _id: existing._id });
        delta = -value;
      } else {
        await Vote.updateOne({ _id: existing._id }, { $set: { value } });
        delta = value * 2;
      }
    } else {
      await Vote.create({
        userId: req.userId,
        targetType: 'post',
        targetId: post._id,
        value,
      });
    }

    const updated = await Post.findByIdAndUpdate(
      post._id,
      { $inc: { voteCount: delta } },
      { new: true }
    ).lean();

    res.json({ success: true, voteCount: updated.voteCount, myVote: existing?.value === value ? null : value });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
