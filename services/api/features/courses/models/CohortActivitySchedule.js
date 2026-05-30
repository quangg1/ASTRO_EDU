const mongoose = require('mongoose');

const cohortActivityScheduleSchema = new mongoose.Schema({
  cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', required: true, index: true },
  lessonSlug: { type: String, required: true },
  openAt: { type: Date, default: null },
  dueAt: { type: Date, default: null },
  closeAt: { type: Date, default: null },
}, { timestamps: true });

cohortActivityScheduleSchema.index({ cohortId: 1, lessonSlug: 1 }, { unique: true });

module.exports = mongoose.model('CohortActivitySchedule', cohortActivityScheduleSchema);
