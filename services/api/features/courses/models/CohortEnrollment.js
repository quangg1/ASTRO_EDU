const mongoose = require('mongoose');

const cohortEnrollmentSchema = new mongoose.Schema({
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', required: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ['student', 'assistant'], default: 'student' },
  joinedAt: { type: Date, default: Date.now },
  /** Lần gửi mã lớp qua email (mã không hiển thị trên app). */
  inviteCodeEmailSentAt: { type: Date, default: null },
}, { timestamps: true });

cohortEnrollmentSchema.index({ cohortId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CohortEnrollment', cohortEnrollmentSchema);
