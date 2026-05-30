const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Forum = require('../models/Forum');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireEnum } = require('../../../shared/validation');
const { AppError } = require('../../../shared/errors');
const { applyVote } = require('../services/voteService');
const { canAccessModToolsOrAdminOverride } = require('../lib/moderationAccess');
const { isNewsForum } = require('../constants/forumCatalog');
const { enrichCommentsWithAuthors } = require('../../users/publicProfileService');
const {
  canMarkCommentHelpful,
  maybeRewardHelpfulAnswer,
  maybeRewardCommentUpvote,
} = require('../services/communityGemService');

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

    const forum = post.forumId ? await Forum.findById(post.forumId).lean() : null;

    const value = requireEnum(req.body?.value, [1, -1], 'value', 'value');
    const voterName =
      req.userDoc?.displayName?.trim() ||
      req.user?.name?.trim() ||
      req.user?.email?.split('@')[0] ||
      'Ai đó';

    const { delta, myVote, shouldNotifyUpvote } = await applyVote({
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

    let gemReward = null;
    if (shouldNotifyUpvote && myVote === 1 && forum && !isNewsForum(forum)) {
      try {
        gemReward = await maybeRewardCommentUpvote({
          comment: updated,
          post,
          forum,
          voterId: req.userId,
        });
      } catch (gemErr) {
        console.error('Community upvote gem reward error:', gemErr);
      }
    }

    res.json({
      success: true,
      voteCount: updated.voteCount,
      myVote,
      gemReward,
    });
  } catch (err) {
    console.error('Comment vote error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:id/helpful', authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    if (comment.isHidden) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    }
    if (comment.isHelpful) {
      return res.status(409).json({ success: false, error: 'Bình luận đã được đánh dấu hữu ích' });
    }

    const post = await Post.findById(comment.postId);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    if (post.isHidden) {
      return res.status(403).json({ success: false, error: 'Bài viết đã bị ẩn' });
    }

    const forum = await Forum.findById(post.forumId).lean();
    if (!forum || isNewsForum(forum)) {
      return res.status(400).json({ success: false, error: 'Không áp dụng cho kênh tin' });
    }

    const canMod = canAccessModToolsOrAdminOverride(req.userRole, req.userDoc);
    const allowed = canMarkCommentHelpful({
      markerId: req.userId,
      markerRole: req.userRole,
      postAuthorId: post.authorId,
      commentAuthorId: comment.authorId,
      canModTools: canMod,
    });
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền đánh dấu hữu ích' });
    }

    comment.isHelpful = true;
    comment.helpfulMarkedBy = req.userId;
    comment.helpfulMarkedAt = new Date();
    await comment.save();

    let gemReward = null;
    try {
      gemReward = await maybeRewardHelpfulAnswer({
        comment: comment.toObject(),
        post: post.toObject(),
        forum,
        markerId: req.userId,
        markerRole: req.userRole,
        canModTools: canMod,
      });
    } catch (gemErr) {
      console.error('Community helpful gem reward error:', gemErr);
    }

    const [enriched] = await enrichCommentsWithAuthors([comment.toObject()]);
    res.json({ success: true, data: enriched, gemReward });
  } catch (err) {
    console.error('Mark comment helpful error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
