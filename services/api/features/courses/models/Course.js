const mongoose = require('mongoose');
const { lessonSectionSchema } = require('../../../shared/schemas/lessonSectionSchema');
const { quizQuestionMongooseSchema } = require('../../../shared/quizQuestion');

const quizQuestionSchema = new mongoose.Schema(quizQuestionMongooseSchema, { _id: false });

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
  sections: [lessonSectionSchema],
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
  /** Link CTA học miễn phí (Learning Path Hub), ví dụ /tutorial */
  crossSellTutorialHref: { type: String, default: '/tutorial' },
  crossSellTutorialLabelVi: { type: String, default: 'Học thêm miễn phí · Lộ trình' },
  /** Mô tả ngắn dưới CTA cross-sell (tùy chọn, markdown không dùng) */
  crossSellTutorialBodyVi: { type: String, default: '' },
  modules: [moduleSchema],
  lessons: [lessonSchema],
  published: { type: Boolean, default: false },
}, { timestamps: true });

courseSchema.index({ published: 1 });

module.exports = mongoose.model('Course', courseSchema);
