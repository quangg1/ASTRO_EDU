const GEM_REASON_LABELS = {
  lp_complete_dwell: 'Hoàn thành bài học (đủ thời gian đọc)',
  depth_complete: 'Hoàn thành mức độ sâu bài học',
  recall_quiz_first: 'Đạt quiz nhớ lần đầu',
  recall_quiz_retry: 'Đạt quiz nhớ khi ôn lại',
  scene_entity_discovered: 'Khám phá vật thể 3D mới',
  scene_contextual_quiz_passed: 'Quiz ngữ cảnh Explore',
  dh_beat_dwell: 'Xem Deep History (đủ thời gian)',
  dh_site_opened: 'Mở điểm Deep History',
  showcase_unlock: 'Mở khóa nội dung Showcase',
  shop_avatar_decoration: 'Mua trang trí avatar',
  admin_manual_adjust: 'Điều chỉnh từ quản trị viên',
  lesson_complete: 'Hoàn thành bài học trong lộ trình',
};

const GEM_ECONOMY_ACTION_LABELS = {
  manual_gem_adjust: 'Điều chỉnh gem thủ công',
  runtime_config_patch: 'Sửa cấu hình vận hành',
  shop_item_create: 'Tạo mã hàng cửa hàng',
  shop_item_update: 'Cập nhật mã hàng cửa hàng',
  decoration_category_create: 'Tạo danh mục trang trí',
  decoration_category_update: 'Cập nhật danh mục trang trí',
  decoration_bulk_import: 'Nhập hàng loạt trang trí avatar',
};

const ADMIN_ACTION_LABELS = {
  enrollment_grant_catalog: 'Cấp quyền tự học',
  enrollment_revoke_catalog: 'Thu hồi quyền tự học',
  enrollment_grant_cohort: 'Cấp quyền lớp',
  enrollment_revoke_cohort: 'Thu hồi quyền lớp',
  order_note_update: 'Cập nhật ghi chú đơn',
  order_refund: 'Hoàn tiền đơn (demo)',
  order_cancel: 'Huỷ đơn pending',
  course_publish: 'Xuất bản khóa học',
  course_unpublish: 'Ẩn khóa học',
  user_role_update: 'Đổi vai trò người dùng',
  user_status_update: 'Đổi trạng thái tài khoản',
  user_scopes_update: 'Cập nhật phạm vi admin con',
  user_delete: 'Xóa người dùng vĩnh viễn',
  news_crawl_trigger: 'Kích hoạt crawl tin',
};

const ROLE_LABELS = {
  student: 'Học viên',
  teacher: 'Giáo viên',
  moderator: 'Điều hành viên',
  admin: 'Quản trị viên',
};

const ACCOUNT_STATUS_LABELS = {
  active: 'Đang hoạt động',
  deactivated: 'Ngừng hoạt động',
};

const ADMIN_SCOPE_LABELS = {
  users: 'Người dùng',
  teachers: 'Đơn giáo viên',
  orders: 'Đơn hàng',
  courses: 'Khóa học',
  moderation: 'Kiểm duyệt',
  gem: 'Gem & cửa hàng',
  promo: 'Coupon',
  broadcast: 'Thông báo broadcast',
  analytics: 'Phân tích & tổng quan',
  system: 'Hệ thống',
  audit: 'Nhật ký kiểm tra',
  '*': 'Toàn quyền',
};

function humanizeCode(raw) {
  return String(raw || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelGemReasonCode(code) {
  const key = String(code || '').trim();
  if (!key) return '—';
  if (GEM_REASON_LABELS[key]) return GEM_REASON_LABELS[key];
  if (/earned for completing a lesson/i.test(key)) return GEM_REASON_LABELS.lesson_complete;
  return humanizeCode(key);
}

function labelGemEconomyAction(action) {
  const key = String(action || '').trim();
  if (!key) return '—';
  return GEM_ECONOMY_ACTION_LABELS[key] || humanizeCode(key);
}

function labelAdminAction(action) {
  const key = String(action || '').trim();
  if (!key) return '—';
  return ADMIN_ACTION_LABELS[key] || labelGemEconomyAction(key) || humanizeCode(key);
}

function labelUserRole(role) {
  const key = String(role || '').trim();
  return ROLE_LABELS[key] || humanizeCode(key);
}

function labelAccountStatus(status) {
  const key = String(status || '').trim();
  return ACCOUNT_STATUS_LABELS[key] || humanizeCode(key);
}

function labelAdminScope(scope) {
  const key = String(scope || '').trim();
  return ADMIN_SCOPE_LABELS[key] || humanizeCode(key);
}

module.exports = {
  GEM_REASON_LABELS,
  GEM_ECONOMY_ACTION_LABELS,
  ADMIN_ACTION_LABELS,
  ROLE_LABELS,
  ACCOUNT_STATUS_LABELS,
  ADMIN_SCOPE_LABELS,
  labelGemReasonCode,
  labelGemEconomyAction,
  labelAdminAction,
  labelUserRole,
  labelAccountStatus,
  labelAdminScope,
};
