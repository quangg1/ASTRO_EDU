const mongoose = require('mongoose');
const { lessonSectionSchema } = require('../../../shared/schemas/lessonSectionSchema');
const { quizQuestionMongooseSchema } = require('../../../shared/quizQuestion');

const quizQuestionSchema = new mongoose.Schema(quizQuestionMongooseSchema, { _id: false });

const resourceLinkSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  url: { type: String, required: true },
  kind: { type: String, enum: ['video', 'article', 'model', 'other'], default: 'other' },
}, { _id: false });

const moduleMaterialSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: '' },
  kind: { type: String, enum: ['pdf', 'slides', 'link', 'video'], default: 'pdf' },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: null },
}, { _id: false });

const quizSettingsSchema = new mongoose.Schema({
  revealMode: {
    type: String,
    enum: ['after_submit', 'after_each_question', 'never'],
    default: 'after_submit',
  },
  timeLimitMinutes: { type: Number, default: null },
  maxAttempts: { type: Number, default: null },
  shuffleOptions: { type: Boolean, default: false },
  passingScorePct: { type: Number, default: null },
  defaultOpenAt: { type: Date, default: null },
  defaultCloseAt: { type: Date, default: null },
}, { _id: false });

const assignmentSettingsSchema = new mongoose.Schema({
  allowedMime: [{ type: String }],
  maxFiles: { type: Number, default: 5 },
  maxBytesPerFile: { type: Number, default: 20 * 1024 * 1024 },
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['text', 'visualization', 'quiz', 'assignment', 'live_session'],
    default: 'text',
  },
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
  quizSettings: { type: quizSettingsSchema, default: null },
  assignmentSettings: { type: assignmentSettingsSchema, default: null },
  meetingUrl: { type: String, default: null },
  liveScheduledAt: { type: Date, default: null },
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
  materials: [moduleMaterialSchema],
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
  /** Giá mặc định khi đăng ký lớp (thường cao hơn catalog). null = dùng price catalog. */
  cohortPrice: { type: Number, default: null },
  cohortCurrency: { type: String, enum: ['VND', 'USD'], default: null },
  /** Giáo viên sở hữu khóa học (teacher); null = chưa gán (cũ) */
  teacherId: { type: String, default: null, index: true },
  /** Catalog = mở quanh năm; cohort = có thể gắn nhiều lớp (delivery layer) */
  catalogEnabled: { type: Boolean, default: true },
  /** self_paced | instructor_led — đồng bộ với catalogEnabled khi lưu */
  distributionStrategy: {
    type: String,
    enum: ['self_paced', 'instructor_led', 'hybrid'],
    default: 'self_paced',
  },
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
