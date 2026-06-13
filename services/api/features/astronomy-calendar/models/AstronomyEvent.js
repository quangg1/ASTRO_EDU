const mongoose = require('mongoose');

const astronomyEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    computeId: { type: String, default: null, index: true, sparse: true },
    status: {
      type: String,
      enum: ['draft', 'review', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    eventKind: {
      type: String,
      enum: ['observable', 'educational'],
      default: 'observable',
    },
    type: {
      type: String,
      enum: ['moon_phase', 'meteor_shower', 'lunar_eclipse', 'solar_eclipse', 'planet_highlight'],
      required: true,
      index: true,
    },
    source: { type: String, default: 'editorial' },
    titleVi: { type: String, required: true },
    summaryVi: { type: String, default: '' },
    subtitleVi: { type: String, default: '' },
    subtitleEn: { type: String, default: '' },
    descriptionVi: { type: String, default: '' },
    observationTipsVi: { type: String, default: '' },
    visibilityLabelVi: { type: String, default: '' },
    typeLabelVi: { type: String, default: '' },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    peakAt: { type: Date, default: null },
    exploreView: { type: String, enum: ['sky', 'solar', null], default: null },
    exploreTarget: { type: String, default: null },
    lessonHref: { type: String, default: null },
    quizHref: { type: String, default: null },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', null],
      default: null,
    },
    moonPhaseHint: { type: String, default: null },
    priority: { type: Number, default: 0 },
    featured: { type: Boolean, default: false, index: true },
    urgencyRank: { type: Number, default: 0 },
    gemRewardOverride: { type: Number, default: null },
    authoredBy: { type: String, default: null },
    publishedBy: { type: String, default: null },
    publishedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true },
);

astronomyEventSchema.index({ status: 1, startAt: 1 });
astronomyEventSchema.index({ status: 1, endAt: 1, peakAt: 1 });

module.exports = mongoose.model('AstronomyEvent', astronomyEventSchema);
