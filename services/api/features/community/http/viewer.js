/**
 * Gom mọi biến thể "lấy tên người dùng" của community về một chỗ.
 *
 * Ba tên gọi khác nhau tồn tại từ trước và mang nghĩa khác nhau khi hiển thị,
 * nên giữ nguyên thay vì gộp làm một.
 */
function toViewer(req) {
  const user = req.user || {};
  return {
    userId: req.userId || null,
    role: req.userRole || null,
    doc: req.userDoc || null,
    /** Lưu vào `authorName` của bài/bình luận. */
    displayName: user.displayName || user.email || 'User',
    /** Hiện trong thông báo "X đã bình luận". */
    notifyName: user.displayName || user.email || 'Thành viên',
    /** Hiện trong thông báo upvote. */
    voterName:
      req.userDoc?.displayName?.trim() ||
      user.name?.trim() ||
      user.email?.split('@')[0] ||
      'Ai đó',
  };
}

module.exports = { toViewer };
