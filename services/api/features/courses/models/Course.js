const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  type: { type: String, enum: ['richtext', 'text', 'image', 'video', 'code', 'embed', '3d', 'callout', 'divider', 'gif', 'math', 'chart', 'slider', 'observable'], default: 'text' },
  title: { type: String, default: '' },
  summary: { type: String, default: '' },
  bullets: [{ type: String }],
  content: { type: String, default: '' },
  html: { type: String, default: '' },
  imageUrl: { type: String, default: null },
  videoUrl: { type: String, default: null },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  embedUrl: { type: String, default: null },
  embedType: { type: String, enum: ['iframe', 'canva', 'gslides', 'figma', 'other'], default: 'iframe' },
  modelUrl: { type: String, default: null },
  calloutVariant: { type: String, enum: ['info', 'warning', 'tip', 'danger'], default: 'info' },
  caption: { type: String, default: '' },
  latex: { type: String, default: '' },
  chartType: { type: String, enum: ['line', 'bar', 'area', 'pie'], default: 'line' },
  chartData: { type: mongoose.Schema.Types.Mixed, default: [] },
  sliderMin: { type: Number, default: 0 },
  sliderMax: { type: Number, default: 100 },
  sliderStep: { type: Number, default: 1 },
  sliderFormula: { type: String, default: '' },
  sliderLabel: { type: String, default: '' },
  sliderUnit: { type: String, default: '' },
  notebookUrl: { type: String, default: null },
}, { _id: false });

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctIndex: { type: Number, required: true },
}, { _id: false });

const resourceLinkSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  url: { type: String, required: true },
  kind: { type: String, enum: ['video', 'article', 'model', 'other'], default: 'other' },
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['text', 'visualization', 'quiz'], default: 'text' },
  visualizationId: { type: String, default: null },
  stageTime: { type: Number, default: null },
  videoUrl: { type: String, default: null },
  coverImage: { type: String, default: null },
  galleryImages: [{ type: String }],
  week: { type: Number, default: null },
  moduleId: { type: String, default: null },
  content: { type: String, default: '' },
  learningGoals: [{ type: String }],
  sections: [sectionSchema],
  quizQuestions: [quizQuestionSchema],
  resourceLinks: [resourceLinkSchema],
  sourcePdf: { type: String, default: null },
  sourcePageCount: { type: Number, default: null },
  order: { type: Number, default: 0 },
}, { _id: true });

const moduleSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { _id: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: null },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  durationWeeks: { type: Number, default: null },
  price: { type: Number, default: 0 },
  currency: { type: String, enum: ['VND', 'USD'], default: 'VND' },
  isPaid: { type: Boolean, default: false },
  /** Giáo viên sở hữu khóa học (teacher); null = chưa gán (cũ) */
  teacherId: { type: String, default: null, index: true },
  modules: [moduleSchema],
  lessons: [lessonSchema],
  published: { type: Boolean, default: false },
}, { timestamps: true });

courseSchema.index({ published: 1 });

module.exports = mongoose.model('Course', courseSchema);
