const mongoose = require('mongoose');

const cohortAnnouncementSchema = new mongoose.Schema(
  {
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    authorId: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 12000 },
    pinned: { type: Boolean, default: false },
    notifyEmail: { type: Boolean, default: false },
  },
  { timestamps: true },
);

cohortAnnouncementSchema.index({ cohortId: 1, pinned: -1, createdAt: -1 });

module.exports = mongoose.model('CohortAnnouncement', cohortAnnouncementSchema);
