const { BaseRepository } = require('../../../shared/db/BaseRepository');
const User = require('../models/User');

/** Mật khẩu và token đặt lại được `select: false` nên phải xin riêng. */
const PASSWORD_FIELD = '+password';
const RESET_FIELDS = '+resetToken +resetTokenExpires';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /** Luồng xác thực cần document thật để gọi `comparePassword()` và `save()`. */
  findDocByEmail(email) {
    return this.findDocOne({ email });
  }

  findDocByEmailWithPassword(email) {
    return this.model.findOne({ email }).select(PASSWORD_FIELD);
  }

  findDocByIdWithPassword(userId) {
    return this.model.findById(userId).select(PASSWORD_FIELD);
  }

  findActiveLocalDocByEmail(email) {
    return this.model
      .findOne({ email, provider: 'local', accountStatus: 'active' })
      .select(`${RESET_FIELDS} email displayName provider accountStatus`);
  }

  findActiveLocalDocByResetToken(token) {
    return this.model
      .findOne({
        resetToken: token,
        resetTokenExpires: { $gt: new Date() },
        provider: 'local',
        accountStatus: 'active',
      })
      .select(`${PASSWORD_FIELD} ${RESET_FIELDS}`);
  }

  findDocById(userId) {
    return this.model.findById(userId);
  }

  updateProfile(userId, update) {
    return this.model.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true });
  }

  deactivate(userId, { reason, actorUserId }) {
    return this.model.findByIdAndUpdate(
      userId,
      {
        $set: {
          accountStatus: 'deactivated',
          deactivatedAt: new Date(),
          deactivatedByUserId: String(actorUserId),
          deactivationReason: reason,
        },
        // Xóa dấu vết khôi phục cũ để lịch sử không mâu thuẫn.
        $unset: { restoredAt: 1 },
      },
      { new: true, runValidators: true },
    );
  }
}

module.exports = { userRepository: new UserRepository() };
