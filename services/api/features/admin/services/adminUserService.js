const mongoose = require('mongoose');
const User = require('../../auth/models/User');
const TeacherApplication = require('../../auth/models/TeacherApplication');
const Enrollment = require('../../courses/models/Enrollment');
const Order = require('../../payment/models/Order');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const AssignmentSubmission = require('../../courses/models/AssignmentSubmission');
const QuizAttempt = require('../../courses/models/QuizAttempt');
const TutorialProgress = require('../../courses/models/TutorialProgress');
const Notification = require('../../notifications/models/Notification');
const ModerationWarning = require('../../community/models/ModerationWarning');
const Post = require('../../community/models/Post');
const Comment = require('../../community/models/Comment');
const Vote = require('../../community/models/Vote');
const UserReward = require('../../rewards/models/UserReward');
const PromoRedemption = require('../../promotions/models/PromoRedemption');
const UserAchievement = require('../../rewards/models/UserAchievement');
const ShowcaseUnlock = require('../../rewards/models/ShowcaseUnlock');
const GemTransaction = require('../../rewards/models/GemTransaction');
const UserProgress = require('../../learning-path/models/UserProgress');
const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const { AppError } = require('../../../shared/errors');
const { sendAccountDeletedEmail } = require('../../../shared/mailer');

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

/**
 * Xóa vĩnh viễn user + dữ liệu liên quan (không thể hoàn tác).
 * Yêu cầu confirmEmail trùng email tài khoản + lý do (gửi email trước khi xóa).
 */
async function deleteAdminUserPermanently({ actorUserId, targetUserId, confirmEmail, reason }) {
  if (targetUserId === actorUserId) {
    throw new AppError(400, 'SELF_DELETE_FORBIDDEN', 'Không thể xóa tài khoản admin đang đăng nhập.');
  }

  const reasonText = String(reason || '').trim();
  if (reasonText.length < 10) {
    throw new AppError(
      400,
      'REASON_REQUIRED',
      'Nhập lý do xóa tài khoản (tối thiểu 10 ký tự) — sẽ gửi cho người dùng qua email.',
    );
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  }

  const expected = String(user.email || '').trim().toLowerCase();
  const typed = String(confirmEmail || '').trim().toLowerCase();
  if (!expected || typed !== expected) {
    throw new AppError(400, 'CONFIRM_EMAIL_MISMATCH', 'Nhập đúng email tài khoản để xác nhận xóa vĩnh viễn.');
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new AppError(400, 'LAST_ADMIN', 'Không thể xóa admin cuối cùng của hệ thống.');
    }
  }

  let emailSent = false;
  if (user.email) {
    const emailResult = await sendAccountDeletedEmail({
      to: user.email,
      displayName: user.displayName,
      reason: reasonText,
    });
    emailSent = !!emailResult.sent;
    if (!emailSent) {
      const hint = emailResult.error
        ? `Chi tiết: ${emailResult.error}`
        : 'Kiểm tra SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM trong services/api/.env rồi restart API.';
      throw new AppError(
        503,
        emailResult.skipped ? 'SMTP_NOT_CONFIGURED' : 'DELETE_EMAIL_FAILED',
        `Không gửi được email thông báo — chưa xóa tài khoản. ${hint}`,
      );
    }
  } else {
    throw new AppError(
      400,
      'NO_EMAIL',
      'Tài khoản không có email — không thể gửi thông báo trước khi xóa.',
    );
  }

  const uid = String(user._id);
  const uidObj = mongoose.Types.ObjectId.isValid(uid) ? new mongoose.Types.ObjectId(uid) : null;

  const postIds = await Post.find({ authorId: uid }).distinct('_id');

  await Promise.all([
    Enrollment.deleteMany({ userId: uid }),
    Order.deleteMany({ userId: uid }),
    CohortEnrollment.deleteMany({ userId: uid }),
    AssignmentSubmission.deleteMany({ userId: uid }),
    QuizAttempt.deleteMany({ userId: uid }),
    TutorialProgress.deleteMany({ userId: uid }),
    Notification.deleteMany({ userId: uid }),
    ModerationWarning.deleteMany({ userId: uid }),
    Vote.deleteMany({ userId: uid }),
    Comment.deleteMany({ $or: [{ authorId: uid }, { postId: { $in: postIds } }] }),
    Post.deleteMany({ authorId: uid }),
    UserReward.deleteMany({ userId: uid }),
    PromoRedemption.deleteMany({ userId: uid }),
    UserAchievement.deleteMany({ userId: uid }),
    ShowcaseUnlock.deleteMany({ userId: uid }),
    GemTransaction.deleteMany({ userId: uid }),
    UserProgress.deleteMany({ userId: uid }),
    LearningPathEvent.deleteMany({ userId: uid }),
    uidObj ? TeacherApplication.deleteMany({ userId: uidObj }) : Promise.resolve(),
  ]);

  await User.findByIdAndDelete(targetUserId);

  return { deletedUserId: uid, email: user.email, emailSent, reason: reasonText };
}

module.exports = {
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
  deleteAdminUserPermanently,
  ROLES,
};
