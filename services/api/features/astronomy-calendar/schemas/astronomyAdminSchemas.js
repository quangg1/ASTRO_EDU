const { z, schemas } = require('../../../shared/http');

const STATUSES = ['draft', 'review', 'published', 'archived'];

/** Console biên tập gửi form thô: chuẩn hóa ở đây để service nhận dữ liệu sạch. */
const text = z.unknown().transform((value) => String(value ?? '').trim());
const nullableRef = z.unknown().transform((value) => value || null);
const counter = z.unknown().transform((value) => Number(value) || 0);

const requiredDate = (label) =>
  z
    .unknown()
    .transform((value) => new Date(value === undefined ? NaN : value))
    .refine((date) => !Number.isNaN(date.getTime()), `${label} không hợp lệ`);

const createEventBody = z
  .object({
    eventId: z.string().trim().min(1, 'Thiếu eventId').max(160),
    status: z
      .unknown()
      .transform((value) => (STATUSES.includes(String(value)) ? String(value) : 'draft')),
    eventKind: z
      .unknown()
      .transform((value) => (value === 'educational' ? 'educational' : 'observable')),
    type: z.unknown().transform((value) => value || 'moon_phase'),
    titleVi: text,
    summaryVi: text,
    subtitleVi: text,
    subtitleEn: text,
    descriptionVi: text,
    observationTipsVi: text,
    visibilityLabelVi: text,
    typeLabelVi: text,
    reviewNote: text,
    startAt: requiredDate('Ngày bắt đầu'),
    endAt: requiredDate('Ngày kết thúc'),
    peakAt: z.unknown().transform((value) => (value ? new Date(value) : null)),
    exploreView: nullableRef,
    exploreTarget: nullableRef,
    lessonHref: nullableRef,
    quizHref: nullableRef,
    difficulty: nullableRef,
    moonPhaseHint: nullableRef,
    priority: counter,
    urgencyRank: counter,
    featured: z.unknown().transform((value) => value === true),
    gemRewardOverride: z
      .unknown()
      .transform((value) => (value === null || value === undefined ? null : Number(value))),
  })
  .refine((body) => body.endAt.getTime() >= body.startAt.getTime(), {
    message: 'Ngày kết thúc phải sau ngày bắt đầu',
    path: ['endAt'],
  });

/** Chỉ khóa có mặt trong body mới được ghi đè — PATCH không được xóa trắng dữ liệu. */
const passthroughIfPresent = z.unknown().optional();

const optionalDate = z
  .unknown()
  .optional()
  .transform((value) => (value ? new Date(value) : undefined));

const updateEventBody = z.object({
  titleVi: passthroughIfPresent,
  summaryVi: passthroughIfPresent,
  subtitleVi: passthroughIfPresent,
  subtitleEn: passthroughIfPresent,
  descriptionVi: passthroughIfPresent,
  observationTipsVi: passthroughIfPresent,
  visibilityLabelVi: passthroughIfPresent,
  typeLabelVi: passthroughIfPresent,
  type: passthroughIfPresent,
  eventKind: passthroughIfPresent,
  exploreView: passthroughIfPresent,
  exploreTarget: passthroughIfPresent,
  lessonHref: passthroughIfPresent,
  quizHref: passthroughIfPresent,
  difficulty: passthroughIfPresent,
  moonPhaseHint: passthroughIfPresent,
  reviewNote: passthroughIfPresent,
  startAt: optionalDate,
  endAt: optionalDate,
  peakAt: z
    .unknown()
    .optional()
    .transform((value) => (value === undefined ? undefined : value ? new Date(value) : null)),
  priority: z
    .unknown()
    .optional()
    .transform((value) => (value == null ? undefined : Number(value) || 0)),
  urgencyRank: z
    .unknown()
    .optional()
    .transform((value) => (value == null ? undefined : Number(value) || 0)),
  featured: z
    .unknown()
    .optional()
    .transform((value) => (value == null ? undefined : Boolean(value))),
  gemRewardOverride: z
    .unknown()
    .optional()
    .transform((value) => (value == null ? undefined : Number(value))),
  status: z
    .unknown()
    .optional()
    .transform((value) => (STATUSES.includes(String(value)) ? String(value) : undefined)),
});

const eventIdParams = z.object({ id: schemas.objectId });

const typeKitParams = z.object({ type: z.string().trim().min(1).max(60) });

/** Nhập gợi ý luôn nằm trong khoảng 30–365 ngày để không quét quá tay. */
const importSuggestionsBody = z.preprocess(
  (value) => (value && typeof value === 'object' ? value : {}),
  z.looseObject({
    days: z.unknown().transform((value) => Math.min(365, Math.max(30, Number(value) || 90))),
    publish: z.unknown().transform((value) => value === true),
  }),
);

module.exports = {
  STATUSES,
  createEventBody,
  updateEventBody,
  eventIdParams,
  typeKitParams,
  importSuggestionsBody,
};
