const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true },
    href: { type: String, required: true },
    labelVi: { type: String, default: '' },
    descriptionVi: { type: String, default: '' },
  },
  { _id: false },
);

const userOnboardingProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    completedAt: { type: Date, default: null },
    skipped: { type: Boolean, default: false },
    primaryIntent: {
      type: String,
      enum: ['learn_path', 'explore_3d', 'stargazing', 'community', 'mixed'],
      default: null,
    },
    topicIds: { type: [String], default: [] },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'some', 'advanced'],
      default: null,
    },
    preferredDepth: {
      type: String,
      enum: ['beginner', 'explorer', 'researcher', null],
      default: null,
    },
    starterLessonId: { type: String, default: null },
    starterModuleId: { type: String, default: null },
    starterNodeId: { type: String, default: null },
    primaryTopicId: { type: String, default: null },
    recommendations: { type: [recommendationSchema], default: [] },
    primaryHref: { type: String, default: '/dashboard' },
  },
  { timestamps: true, minimize: false },
);

module.exports =
  mongoose.models.UserOnboardingProfile ||
  mongoose.model('UserOnboardingProfile', userOnboardingProfileSchema);
