const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 6,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'multi'],
      default: 'local',
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'moderator', 'admin'],
      default: 'student',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'deactivated'],
      default: 'active',
      index: true,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    deactivatedByUserId: {
      type: String,
      default: null,
    },
    deactivationReason: {
      type: String,
      trim: true,
      default: '',
    },
    restoredAt: {
      type: Date,
      default: null,
    },
    /** Legacy — ưu tiên dùng googleId / facebookId */
    providerId: {
      type: String,
      sparse: true,
      index: true,
    },
    /** Google OAuth subject (Passport hoặc Firebase identities) */
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    /** Facebook OAuth id */
    facebookId: {
      type: String,
      sparse: true,
      unique: true,
    },
    /** Firebase Auth uid — một user có thể đăng nhập GG/FB qua Firebase cùng email */
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
    },
    resetToken: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
