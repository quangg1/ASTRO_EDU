const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const { AppError } = require('../../../shared/errors');

/**
 * Read-only user lookups exposed to other features.
 *
 * Other bounded contexts (courses, admin, community…) need display names and
 * emails but must not reach into the `User` model directly — this service is
 * the identity feature's public read API.
 */

const DIRECTORY_FIELDS = '_id displayName email';

function toDirectoryEntry(user) {
  const id = String(user._id);
  return {
    id,
    displayName: user.displayName || user.email || id,
    email: user.email || null,
  };
}

async function listDirectoryEntries(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const users = await User.find({ _id: { $in: ids } })
    .select(DIRECTORY_FIELDS)
    .lean();
  return users.map(toDirectoryEntry);
}

async function findDirectoryEntry(userId) {
  if (!userId) return null;
  const user = await User.findById(userId).select(DIRECTORY_FIELDS).lean();
  return user ? toDirectoryEntry(user) : null;
}

/** Thẻ hiển thị trong danh sách/hội thoại: tên + ảnh, không kèm email. */
async function listProfileCards(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const users = await User.find({ _id: { $in: ids } })
    .select('_id displayName avatar')
    .lean();
  return users.map((user) => ({
    id: String(user._id),
    displayName: user.displayName || '',
    avatar: user.avatar || null,
  }));
}

/** Author cards for community snippets (active accounts only). */
async function listPublicAuthorCards(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const users = await User.find({
    _id: { $in: ids },
    accountStatus: { $ne: 'deactivated' },
  })
    .select('_id displayName avatar role')
    .lean();
  return users.map((user) => ({
    id: String(user._id),
    displayName: user.displayName || '',
    avatar: user.avatar || null,
    role: user.role || 'student',
  }));
}

/** Public profile page fields. */
async function findPublicProfileUser(userId) {
  if (!userId) return null;
  const user = await User.findById(userId)
    .select('displayName avatar role createdAt accountStatus')
    .lean();
  if (!user) return null;
  return {
    id: String(user._id),
    displayName: user.displayName || '',
    avatar: user.avatar || null,
    role: user.role || 'student',
    createdAt: user.createdAt || null,
    accountStatus: user.accountStatus || 'active',
  };
}

/** Trạng thái tài khoản cho các cổng vào realtime/nhắn tin. */
async function findAccountSummary(userId) {
  if (!userId) return null;
  const user = await User.findById(userId)
    .select('_id displayName avatar accountStatus')
    .lean();
  if (!user) return null;
  return {
    id: String(user._id),
    displayName: user.displayName || '',
    avatar: user.avatar || null,
    accountStatus: user.accountStatus || 'active',
    isActive: user.accountStatus !== 'deactivated',
  };
}

const DIRECTORY_SEARCH_LIMIT = 50;

/** Tìm id theo tên/email cho bộ lọc admin; regex được thoát trước khi dùng. */
async function searchDirectoryIds(term, limit = DIRECTORY_SEARCH_LIMIT) {
  const trimmed = String(term || '').trim();
  if (!trimmed) return [];
  const rx = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({ $or: [{ email: rx }, { displayName: rx }] })
    .select('_id')
    .limit(limit)
    .lean();
  return users.map((user) => String(user._id));
}

/** `{ [userId]: displayName }`, falling back to email then id. */
async function getDisplayNameMap(userIds) {
  const entries = await listDirectoryEntries(userIds);
  return Object.fromEntries(entries.map((entry) => [entry.id, entry.displayName]));
}

/** Entries that actually have an email, for notification fan-out. */
async function listMailableRecipients(userIds) {
  const entries = await listDirectoryEntries(userIds);
  return entries.filter((entry) => entry.email?.trim());
}

const TEACHER_PICKER_LIMIT = 200;

/**
 * Active teachers for the admin course-owner picker, enriched with their
 * public profile name/headline when one exists.
 */
async function listTeacherOptions() {
  const teachers = await User.find({ role: 'teacher', accountStatus: { $ne: 'deactivated' } })
    .select('_id email displayName avatar')
    .sort({ displayName: 1, email: 1 })
    .limit(TEACHER_PICKER_LIMIT)
    .lean();
  if (!teachers.length) return [];

  const profiles = await TeacherProfile.find({ userId: { $in: teachers.map((u) => String(u._id)) } })
    .select('userId fullName headline')
    .lean();
  const profileByUserId = new Map(profiles.map((p) => [String(p.userId), p]));

  return teachers.map((user) => {
    const id = String(user._id);
    const profile = profileByUserId.get(id);
    return {
      id,
      email: user.email || null,
      displayName: user.displayName || '',
      fullName:
        profile?.fullName?.trim() ||
        user.displayName?.trim() ||
        user.email?.split('@')[0] ||
        'Giảng viên',
      headline: profile?.headline || '',
    };
  });
}

/** Asserts a user id belongs to an active teacher, for ownership assignment. */
async function assertActiveTeacher(userId) {
  const user = await User.findById(userId).select('role accountStatus').lean();
  if (!user || user.role !== 'teacher') {
    throw new AppError(
      400,
      'INVALID_TEACHER',
      'Giảng viên không hợp lệ — chọn tài khoản role teacher',
    );
  }
  if (user.accountStatus === 'deactivated') {
    throw new AppError(400, 'TEACHER_DEACTIVATED', 'Tài khoản giảng viên đã ngừng hoạt động');
  }
  return user;
}

/**
 * Active account ids for admin broadcast fan-out.
 * @param {{ roles?: string[] }} [opts]
 */
async function listActiveUserIds({ roles } = {}) {
  const filter = { accountStatus: 'active' };
  const roleList = Array.isArray(roles)
    ? roles.map((r) => String(r).trim()).filter(Boolean)
    : [];
  if (roleList.length) filter.role = { $in: roleList };

  const users = await User.find(filter).select('_id').lean();
  return users.map((user) => String(user._id));
}

module.exports = {
  listDirectoryEntries,
  findDirectoryEntry,
  listProfileCards,
  listPublicAuthorCards,
  findPublicProfileUser,
  findAccountSummary,
  searchDirectoryIds,
  getDisplayNameMap,
  listMailableRecipients,
  listTeacherOptions,
  assertActiveTeacher,
  listActiveUserIds,
};
