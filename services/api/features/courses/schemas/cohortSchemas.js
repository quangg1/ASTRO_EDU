const { z, schemas } = require('../../../shared/http');

const CURRENCIES = ['VND', 'USD'];
const COHORT_STATUSES = ['draft', 'open', 'closed'];
const SUBMISSION_STATUSES = ['all', 'draft', 'submitted', 'graded', 'returned'];

/** `""`/`null` clear the field; anything else must parse as a date. */
const nullableDate = z
  .union([z.string(), z.number(), z.date(), z.null()])
  .transform((value, ctx) => {
    if (value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Thời điểm không hợp lệ' });
      return z.NEVER;
    }
    return date;
  });

/** Money is stored as a non-negative integer minor-unit-free amount, or null. */
const nullableAmount = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => {
    if (value === null || value === '') return null;
    return Math.max(0, Math.round(Number(value)) || 0);
  });

/** Unknown currencies degrade to `null` (inherit the course currency). */
const nullableCurrency = z
  .unknown()
  .transform((value) => (CURRENCIES.includes(value) ? value : null));

const createCohortBody = z.object({
  title: z.string().trim().max(200).optional(),
  slug: z.string().trim().max(160).optional(),
  timezone: z.string().trim().max(64).default('Asia/Ho_Chi_Minh'),
  status: z.enum(['draft', 'open']).default('draft'),
  startAt: nullableDate.optional().default(null),
  endAt: nullableDate.optional().default(null),
  teacherId: z.string().trim().optional().nullable(),
  price: nullableAmount.optional().default(null),
  currency: nullableCurrency.optional().default(null),
});

const updateCohortBody = z.object({
  status: z.enum(COHORT_STATUSES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  startAt: nullableDate.optional(),
  endAt: nullableDate.optional(),
  moduleWeekMap: z.unknown().optional(),
  price: nullableAmount.optional(),
  currency: nullableCurrency.optional(),
});

const enrollBody = z.object({
  cohortId: schemas.trimmedString(64, 'cohortId'),
});

const createAnnouncementBody = z.object({
  title: schemas.trimmedString(200, 'Tiêu đề'),
  body: z.string().trim().max(12000).default(''),
  pinned: z.coerce.boolean().default(false),
  notifyEmail: z.coerce.boolean().default(false),
});

const updateAnnouncementBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().max(12000).optional(),
  pinned: z.coerce.boolean().optional(),
});

const gradeSubmissionBody = z.object({
  grade: z.coerce.number().min(0).max(100).optional().nullable(),
  feedback: z.string().max(4000).optional(),
  status: z.enum(['graded']).optional(),
});

const submissionsQuery = z.object({
  status: z.enum(SUBMISSION_STATUSES).default('submitted'),
});

const applyWeeklyBody = z.object({
  week1OpenAtLocal: schemas.trimmedString(64, 'Ngày mở tuần 1'),
  daysPerWeek: z.coerce.number().int().min(1).max(28).default(7),
  setDueAndClose: z.coerce.boolean().default(true),
});

const copySchedulesBody = z.object({
  sourceCohortId: schemas.trimmedString(64, 'sourceCohortId'),
});

const scheduleItem = z
  .object({
    lessonSlug: schemas.trimmedString(200, 'lessonSlug'),
    openAt: z.string().optional(),
    dueAt: z.string().optional(),
    closeAt: z.string().optional(),
    openAtLocal: z.string().optional(),
    dueAtLocal: z.string().optional(),
    closeAtLocal: z.string().optional(),
  })
  .passthrough();

const saveSchedulesBody = z.object({
  schedules: z.array(scheduleItem).max(500).default([]),
});

const courseSlugParams = z.object({ slug: z.string().trim().min(1) });

const cohortParams = courseSlugParams.extend({
  cohortId: schemas.objectId,
});

const announcementParams = cohortParams.extend({
  announcementId: schemas.objectId,
});

const submissionParams = cohortParams.extend({
  submissionId: schemas.objectId,
});

module.exports = {
  createCohortBody,
  updateCohortBody,
  enrollBody,
  createAnnouncementBody,
  updateAnnouncementBody,
  gradeSubmissionBody,
  submissionsQuery,
  applyWeeklyBody,
  copySchedulesBody,
  saveSchedulesBody,
  courseSlugParams,
  cohortParams,
  announcementParams,
  submissionParams,
  CURRENCIES,
  COHORT_STATUSES,
};
