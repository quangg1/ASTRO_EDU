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
    applicationEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    fullName: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    headline: { type: String, trim: true, default: '', maxlength: 300 },
    city: { type: String, trim: true, default: '', maxlength: 120 },
    organizationRole: { type: String, trim: true, default: '', maxlength: 200 },
    teachingLevels: { type: [String], default: [] },
    bio: { type: String, trim: true, maxlength: 4000 },
    organization: { type: String, trim: true, maxlength: 500 },
    expertise: { type: [String], default: [] },
    education: { type: String, trim: true, maxlength: 2000 },
    yearsExperience: { type: Number, min: 0, max: 80, default: null },
    website: { type: String, trim: true, maxlength: 500 },
    linkedin: { type: String, trim: true, maxlength: 500 },
    avatarUrl: { type: String, default: null },
    cvUrl: { type: String, default: null },
    cvFileName: { type: String, trim: true, default: '', maxlength: 260 },
    certificateUrl: { type: String, default: null },
    certificateFileName: { type: String, trim: true, default: '', maxlength: 260 },
    cvReviewedAt: { type: Date, default: null },
    cvReviewedByUserId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedByUserId: { type: String, default: null },
    reviewNote: { type: String, trim: true, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

teacherApplicationSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('TeacherApplication', teacherApplicationSchema);
