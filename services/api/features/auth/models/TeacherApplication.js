const mongoose = require('mongoose');

const teacherApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    bio: { type: String, trim: true, maxlength: 4000 },
    organization: { type: String, trim: true, maxlength: 500 },
    reviewedAt: { type: Date, default: null },
    reviewedByUserId: { type: String, default: null },
    reviewNote: { type: String, trim: true, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

teacherApplicationSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('TeacherApplication', teacherApplicationSchema);
