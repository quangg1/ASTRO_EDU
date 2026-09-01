const { z, schemas } = require('../../../shared/http');

const { trimmedString } = schemas;

/** Panel Explore hỏi tối đa 12 concept một lượt để giữ truy vấn nhỏ. */
const MAX_CONCEPT_IDS = 12;

const conceptIdsQuery = z.object({
  ids: z
    .string()
    .catch('')
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, MAX_CONCEPT_IDS),
    ),
});

const lessonIdParams = z.object({ lessonId: trimmedString(200, 'lessonId') });
const conceptIdParams = z.object({ conceptId: trimmedString(200, 'conceptId') });

const weakLessonsQuery = z.object({
  lessonId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

const spacedReviewQuery = z.object({
  limit: z.coerce.number().int().catch(5).default(5).transform((value) => Math.min(Math.max(value, 1), 50)),
});

/** Client có thể gửi một sự kiện hoặc cả lô; engine tự kiểm tra từng cái. */
const learningEventsBody = z
  .preprocess(
    (value) => (value && typeof value === 'object' ? value : {}),
    z.object({ events: z.array(z.record(z.string(), z.unknown())).optional() }).loose(),
  )
  .transform((body) => (Array.isArray(body.events) ? body.events : [body]));

module.exports = {
  MAX_CONCEPT_IDS,
  conceptIdsQuery,
  lessonIdParams,
  conceptIdParams,
  weakLessonsQuery,
  spacedReviewQuery,
  learningEventsBody,
};
