const mongoose = require('mongoose');

const userSavedItemSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    source: { type: String, enum: ['learning-path', 'course'], required: true, index: true },
    itemKey: { type: String, required: true },
    lessonId: { type: String, default: null, index: true },
    moduleId: { type: String, default: null },
    nodeId: { type: String, default: null },
    depth: { type: String, enum: ['beginner', 'explorer', 'researcher', null], default: null },
    courseSlug: { type: String, default: null, index: true },
    lessonSlug: { type: String, default: null, index: true },
    courseId: { type: String, default: null },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    savedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, minimize: false },
);

userSavedItemSchema.index({ userId: 1, itemKey: 1 }, { unique: true });
userSavedItemSchema.index({ userId: 1, source: 1, savedAt: -1 });

module.exports = mongoose.models.UserSavedItem || mongoose.model('UserSavedItem', userSavedItemSchema);
