const mongoose = require('mongoose');

const cohortSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
  status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft', index: true },
  inviteCode: { type: String, default: null, index: true },
  teacherId: { type: String, default: null, index: true },
}, { timestamps: true });

cohortSchema.index({ courseId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Cohort', cohortSchema);
