const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { canAccessModTools, canAccessModToolsOrAdminOverride } = require('../lib/moderationAccess');
const moderationService = require('../services/moderationService');

const router = express.Router();

function requireMod(req, res, next) {
  if (!canAccessModTools(req.userRole)) {
    return res.status(403).json({ success: false, error: 'Chỉ điều hành viên (moderator) mới truy cập được' });
  }
  next();
}

function requireModOrAdminOverride(req, res, next) {
  if (!canAccessModToolsOrAdminOverride(req.userRole)) {
    return res.status(403).json({ success: false, error: 'Không có quyền kiểm duyệt' });
  }
  next();
}

/** Bất kỳ user đăng nhập — báo cáo bài/bình luận */
router.post('/reports', authMiddleware, async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body || {};
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, error: 'Thiếu targetType hoặc targetId' });
    }
    const data = await moderationService.createReport({
      reporterId: req.userId,
      reporterName: req.user?.displayName || req.user?.email,
      targetType,
      targetId,
      reason,
      details,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('POST /community/mod/reports error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.get('/reports/reasons', (_req, res) => {
  res.json({ success: true, data: moderationService.REPORT_REASONS });
});

/** Hàng đợi kiểm duyệt — chỉ moderator */
router.get('/queue', authMiddleware, requireMod, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const limit = parseInt(req.query.limit, 10) || 40;
    const data = await moderationService.getModerationQueue({ status, limit });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /community/mod/queue error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

router.post('/reports/:id/resolve', authMiddleware, requireMod, async (req, res) => {
  try {
    const { status, resolutionNote } = req.body || {};
    const data = await moderationService.resolveReport({
      reportId: req.params.id,
      moderatorId: req.userId,
      status,
      resolutionNote,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('POST resolve report error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.post('/warn', authMiddleware, requireMod, async (req, res) => {
  try {
    const { userId, message, relatedReportId, postId } = req.body || {};
    if (!userId || !message?.trim()) {
      return res.status(400).json({ success: false, error: 'Thiếu userId hoặc nội dung cảnh báo' });
    }
    const data = await moderationService.issueWarning({
      userId,
      message,
      issuedBy: req.userId,
      issuedByName: req.user?.displayName || req.user?.email,
      relatedReportId,
      postId,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('POST /community/mod/warn error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.patch('/posts/:id/hidden', authMiddleware, requireModOrAdminOverride, async (req, res) => {
  try {
    const { hidden } = req.body || {};
    const data = await moderationService.setPostHidden({
      postId: req.params.id,
      hidden: Boolean(hidden),
      moderatorId: req.userId,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('PATCH post hidden error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.patch('/comments/:id/hidden', authMiddleware, requireModOrAdminOverride, async (req, res) => {
  try {
    const { hidden } = req.body || {};
    const data = await moderationService.setCommentHidden({
      commentId: req.params.id,
      hidden: Boolean(hidden),
      moderatorId: req.userId,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('PATCH comment hidden error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

router.delete('/comments/:id', authMiddleware, requireModOrAdminOverride, async (req, res) => {
  try {
    await moderationService.deleteComment({ commentId: req.params.id });
    res.json({ success: true, message: 'Đã xóa bình luận' });
  } catch (err) {
    console.error('DELETE mod comment error:', err);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Lỗi server' });
  }
});

module.exports = router;
