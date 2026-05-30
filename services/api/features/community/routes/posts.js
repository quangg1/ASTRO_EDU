const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Vote = require('../models/Vote');
const { applyVote, mapMyVotes } = require('../services/voteService');
const Forum = require('../models/Forum');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');
const { publicVisibilityFilter, canAccessModToolsOrAdminOverride } = require('../lib/moderationAccess');
const { requireString, requireEnum } = require('../../../shared/validation');
const { AppError } = require('../../../shared/errors');
const {
  enrichPostsWithAuthors,
  enrichCommentsWithAuthors,
} = require('../../users/publicProfileService');
const { sanitizeDiscussionHtml, isEffectivelyEmptyHtml } = require('../lib/sanitizeHtml');
const {
  notifyCommunityCommentOnPost,
  notifyCommunityReply,
} = require('../../notifications/services/notificationService');

const router = express.Router();

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });

    if (post.isHidden && !canAccessModToolsOrAdminOverride(req.userRole, req.userDoc)) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    }

    const commentFilter = { postId: post._id, ...publicVisibilityFilter(req.userRole, req.userDoc) };
    const commentsRaw = await Comment.find(commentFilter).sort({ createdAt: 1 }).lean();

    const [enrichedPost] = await enrichPostsWithAuthors([post]);
    let comments = await enrichCommentsWithAuthors(commentsRaw);

    let myVote = null;
    if (req.userId) {
      const v = await Vote.findOne({ userId: req.userId, targetType: 'post', targetId: post._id });
      if (v) myVote = v.value;
      const commentVoteMap = await mapMyVotes(
        req.userId,
        'comment',
        comments.map((c) => c._id),
      );
      comments = comments.map((c) => ({
        ...c,
        myVote: commentVoteMap[String(c._id)] ?? null,
      }));
    }

    res.json({
      success: true,
      data: { ...enrichedPost, comments, myVote },
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const updated = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    res.json({ success: true, viewCount: updated.viewCount });
  } catch (err) {
    console.error('Track post view error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    if (post.isHidden) {
      return res.status(403).json({ success: false, error: 'Bài viết đã bị ẩn' });
    }

    const rawContent = requireString(req.body?.content, 'content', 'Nội dung');
    const content = sanitizeDiscussionHtml(rawContent);
    if (isEffectivelyEmptyHtml(content)) {
      return res.status(400).json({ success: false, error: 'Nội dung bình luận trống' });
    }
    const { parentId } = req.body || {};

    let parentComment = null;
    if (parentId) {
      parentComment = await Comment.findOne({ _id: parentId, postId: post._id });
      if (!parentComment) {
        return res.status(400).json({ success: false, error: 'Bình luận cha không hợp lệ' });
      }
    }

    const comment = await Comment.create({
      postId: post._id,
      authorId: req.userId,
      authorName: req.user?.displayName || req.user?.email || 'User',
      content,
      parentId: parentComment?._id || null,
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });
    const [enriched] = await enrichCommentsWithAuthors([comment.toObject ? comment.toObject() : comment]);

    const postIdStr = String(post._id);
    const commenterName = req.user?.displayName || req.user?.email || 'Thành viên';
    const notifyPayload = {
      postId: postIdStr,
      postTitle: post.title,
      commenterName,
      commentPreview: content,
    };
    if (parentComment) {
      if (parentComment.authorId && String(parentComment.authorId) !== String(req.userId)) {
        void notifyCommunityReply({ userId: String(parentComment.authorId), ...notifyPayload });
      }
      if (
        post.authorId &&
        String(post.authorId) !== String(req.userId) &&
        String(post.authorId) !== String(parentComment.authorId)
      ) {
        void notifyCommunityCommentOnPost({ userId: String(post.authorId), ...notifyPayload });
      }
    } else if (post.authorId && String(post.authorId) !== String(req.userId)) {
      void notifyCommunityCommentOnPost({ userId: String(post.authorId), ...notifyPayload });
    }

    res.status(201).json({ success: true, data: enriched });
  } catch (err) {
    console.error('Add comment error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });

    const value = requireEnum(req.body?.value, [1, -1], 'value', 'value');
    const voterName =
      req.userDoc?.displayName?.trim() ||
      req.user?.name?.trim() ||
      req.user?.email?.split('@')[0] ||
      'Ai đó';

    const { delta, myVote } = await applyVote({
      targetType: 'post',
      targetId: post._id,
      userId: req.userId,
      value,
      authorId: post.authorId,
      voterName,
      postId: String(post._id),
      postTitle: post.title,
    });

    const updated = await Post.findByIdAndUpdate(
      post._id,
      { $inc: { voteCount: delta } },
      { new: true }
    ).lean();

    res.json({ success: true, voteCount: updated.voteCount, myVote });
  } catch (err) {
    console.error('Vote error:', err);
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message, details: err.details });
    }
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!canAccessModToolsOrAdminOverride(req.userRole, req.userDoc)) {
      return res.status(403).json({ success: false, error: 'Không có quyền kiểm duyệt' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    const { isPinned } = req.body || {};
    if (typeof isPinned === 'boolean') {
      post.isPinned = isPinned;
      await post.save();
    }
    const updated = await Post.findById(post._id).lean();
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Moderate post error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!canAccessModToolsOrAdminOverride(req.userRole, req.userDoc)) {
      return res.status(403).json({ success: false, error: 'Không có quyền kiểm duyệt' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết' });
    await Comment.deleteMany({ postId: post._id });
    await Vote.deleteMany({ targetType: 'post', targetId: post._id });
    await Post.findByIdAndDelete(post._id);
    const forum = await Forum.findById(post.forumId);
    if (forum) await forum.updateOne({ $inc: { postCount: -1 } });
    res.json({ success: true, message: 'Đã xóa bài viết' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

module.exports = router;
