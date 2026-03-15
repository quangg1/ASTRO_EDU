const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  lessonSlug: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { _id: false });

const enrollmentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  progress: [progressSchema],
  enrolledAt: { type: Date, default: Date.now },
}, { timestamps: true });

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
