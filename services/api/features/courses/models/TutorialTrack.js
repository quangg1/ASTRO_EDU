const mongoose = require('mongoose');

// Một track tương đương với "Python Tutorial" trên GeeksforGeeks,
// bên trong có các section (Basics, Functions, ...) và mỗi section là list bài (tutorialSlug).

const trackItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    tutorialSlug: { type: String, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const trackSubtopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    items: [trackItemSchema],
  },
  { _id: false },
);

const trackTopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    subtopics: [trackSubtopicSchema],
  },
  { _id: false },
);

const tutorialTrackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    level: { type: Number, default: 1 }, // 1: Beginner, 2: Explorer, 3: Research
    order: { type: Number, default: 0 },
    // topics ~ Level 2 (Topic), subtopics ~ Level 3, items ~ Level 4 (Lesson)
    topics: [trackTopicSchema],
  },
  { timestamps: true },
);

tutorialTrackSchema.index({ slug: 1 });
tutorialTrackSchema.index({ level: 1, order: 1 });

module.exports = mongoose.model('TutorialTrack', tutorialTrackSchema);

