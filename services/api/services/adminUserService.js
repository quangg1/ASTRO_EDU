const User = require('../features/auth/models/User');
const { AppError } = require('../shared/errors');

const ROLES = ['student', 'teacher', 'moderator', 'admin'];

async function listAdminUsers() {
  const users = await User.find()
    .select('email displayName avatar provider role accountStatus deactivatedAt deactivatedByUserId deactivationReason restoredAt createdAt')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return users.map((u) => ({
    id: u._id,
    email: u.email,
    displayName: u.displayName,
    avatar: u.avatar,
    provider: u.provider,
    role: u.role || 'student',
    accountStatus: u.accountStatus || 'active',
    deactivatedAt: u.deactivatedAt || null,
    deactivatedByUserId: u.deactivatedByUserId || null,
    deactivationReason: u.deactivationReason || '',
    restoredAt: u.restoredAt || null,
    createdAt: u.createdAt,
  }));
}

async function updateAdminUserRole({ actorUserId, targetUserId, role }) {
  if (!ROLES.includes(role)) {
    throw new AppError(400, 'INVALID_ROLE', 'Vai trò không hợp lệ. Chọn: student, teacher, moderator, admin');
  }
  if (targetUserId === actorUserId && role !== 'admin') {
    throw new AppError(400, 'SELF_DEMOTION_FORBIDDEN', 'Admin không được tự hạ quyền của chính mình');
  }

  const user = await User.findByIdAndUpdate(
    targetUserId,
    { $set: { role } },
    { new: true, runValidators: true }
  ).select('email displayName avatar provider role accountStatus deactivatedAt deactivatedByUserId deactivationReason restoredAt createdAt');

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }

  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    provider: user.provider,
    role: user.role || 'student',
    accountStatus: user.accountStatus || 'active',
    deactivatedAt: user.deactivatedAt || null,
    deactivatedByUserId: user.deactivatedByUserId || null,
    deactivationReason: user.deactivationReason || '',
    restoredAt: user.restoredAt || null,
    createdAt: user.createdAt,
  };
}

async function updateAdminUserStatus({ actorUserId, targetUserId, accountStatus, reason }) {
  if (!['active', 'deactivated'].includes(accountStatus)) {
    throw new AppError(400, 'INVALID_ACCOUNT_STATUS', 'Trạng thái tài khoản không hợp lệ');
  }
  if (targetUserId === actorUserId && accountStatus === 'deactivated') {
    throw new AppError(400, 'SELF_DEACTIVATION_FORBIDDEN', 'Admin không được tự ngừng hoạt động tài khoản của chính mình');
  }

  const update =
    accountStatus === 'deactivated'
      ? {
          $set: {
            accountStatus: 'deactivated',
            deactivatedAt: new Date(),
            deactivatedByUserId: String(actorUserId),
            deactivationReason: typeof reason === 'string' ? reason.trim() : '',
          },
          $unset: { restoredAt: 1 },
        }
      : {
          $set: {
            accountStatus: 'active',
            restoredAt: new Date(),
          },
          $unset: {
            deactivatedAt: 1,
            deactivatedByUserId: 1,
            deactivationReason: 1,
          },
        };

  const user = await User.findByIdAndUpdate(targetUserId, update, { new: true, runValidators: true })
    .select('email displayName avatar provider role accountStatus deactivatedAt deactivatedByUserId deactivationReason restoredAt createdAt');

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }

  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    provider: user.provider,
    role: user.role || 'student',
    accountStatus: user.accountStatus || 'active',
    deactivatedAt: user.deactivatedAt || null,
    deactivatedByUserId: user.deactivatedByUserId || null,
    deactivationReason: user.deactivationReason || '',
    restoredAt: user.restoredAt || null,
    createdAt: user.createdAt,
  };
}

module.exports = { listAdminUsers, updateAdminUserRole, updateAdminUserStatus, ROLES };
