const mongoose = require('mongoose');

/** Đồng bộ `SectionType` client — `features/courses/api/coursesApi.ts` */
const LESSON_SECTION_TYPES = [
  'richtext',
  'text',
  'image',
  'video',
  'code',
  'embed',
  '3d',
  'callout',
  'divider',
  'gif',
  'math',
  'chart',
  'slider',
  'observable',
];

const lessonSectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: LESSON_SECTION_TYPES, default: 'text' },
    sectionLevel: { type: String, enum: ['main', 'sub'], default: 'main' },
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    bullets: [{ type: String }],
    content: { type: String, default: '' },
    html: { type: String, default: '' },
    imageUrl: { type: String, default: null },
    imageWidthPct: { type: Number, default: null },
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
    videoTranscript: {
      language: { type: String, default: 'vi' },
      cues: [
        {
          startSeconds: { type: Number, default: 0 },
          text: { type: String, default: '' },
        },
      ],
    },
  },
  { _id: false },
);

/** Lọc section không hợp lệ (giữ data cũ hợp lệ khi migrate từ Mixed). */
function coerceLessonSections(sections) {
  if (!Array.isArray(sections)) return { sections: [], dropped: 0 };
  const out = [];
  let dropped = 0;
  for (const raw of sections) {
    if (!raw || typeof raw !== 'object') {
      dropped += 1;
      continue;
    }
    const type = String(raw.type || '').trim();
    if (!LESSON_SECTION_TYPES.includes(type)) {
      dropped += 1;
      continue;
    }
    out.push(raw);
  }
  return { sections: out, dropped };
}

module.exports = {
  LESSON_SECTION_TYPES,
  lessonSectionSchema,
  coerceLessonSections,
};
