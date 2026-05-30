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
  /** null = dùng course.cohortPrice hoặc course.price */
  price: { type: Number, default: null },
  currency: { type: String, enum: ['VND', 'USD'], default: null },
  /** moduleId → delivery week (1-based) for this cohort */
  moduleWeekMap: { type: Map, of: Number, default: undefined },
}, { timestamps: true });

cohortSchema.index({ courseId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Cohort', cohortSchema);
