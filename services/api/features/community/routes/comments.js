const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireEnum } = require('../../../shared/validation');
const { AppError } = require('../../../shared/errors');
const { applyVote } = require('../services/voteService');

const router = express.Router();

router.post('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    if (comment.isHidden) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    }

    const post = await Post.findById(comment.postId).lean();
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });

    const value = requireEnum(req.body?.value, [1, -1], 'value', 'value');
    const voterName =
      req.userDoc?.displayName?.trim() ||
      req.user?.name?.trim() ||
      req.user?.email?.split('@')[0] ||
      'Ai đó';

    const { delta, myVote } = await applyVote({
      targetType: 'comment',
      targetId: comment._id,
      userId: req.userId,
      value,
      authorId: comment.authorId,
      voterName,
      postId: String(comment.postId),
      postTitle: post.title,
    });

    const updated = await Comment.findByIdAndUpdate(
      comment._id,
      { $inc: { voteCount: delta } },
      { new: true },
    ).lean();

    res.json({
      success: true,
      voteCount: updated.voteCount,
      myVote,
    });
  } catch (err) {
    console.error('Comment vote error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
