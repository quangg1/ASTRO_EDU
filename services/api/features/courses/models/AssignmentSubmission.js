const mongoose = require('mongoose');

const submissionFileSchema = new mongoose.Schema({
  storageKey: { type: String, required: true },
  url: { type: String, required: true },
  name: { type: String, default: '' },
  mime: { type: String, default: 'application/octet-stream' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['ok', 'expired'], default: 'ok' },
}, { _id: false });

const assignmentSubmissionSchema = new mongoose.Schema({
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', default: null, index: true },
  userId: { type: String, required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonSlug: { type: String, required: true },
  status: { type: String, enum: ['draft', 'submitted', 'graded'], default: 'draft', index: true },
  stagingFiles: [submissionFileSchema],
  files: [submissionFileSchema],
  note: { type: String, default: '' },
  submittedAt: { type: Date, default: null },
  isLate: { type: Boolean, default: false },
  grade: { type: Number, default: null },
  feedback: { type: String, default: '' },
  gradedBy: { type: String, default: null },
  gradedAt: { type: Date, default: null },
  stagingExpired: { type: Boolean, default: false },
}, { timestamps: true });

assignmentSubmissionSchema.index(
  { userId: 1, courseId: 1, lessonSlug: 1, cohortId: 1 },
  { unique: true, name: 'assignment_submission_unique' },
);

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
