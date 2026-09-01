const { z, schemas } = require('../../../shared/http');

const { objectId, slug, trimmedString } = schemas;

/**
 * `catalog` là chỗ giữ chỗ trong URL cho "học lẻ, không thuộc lớp nào" —
 * chuẩn hóa sớm để tầng dưới chỉ thấy id hoặc null.
 */
const cohortIdSegment = z
  .union([z.literal('catalog'), objectId])
  .nullish()
  .transform((value) => (!value || value === 'catalog' ? null : value));

const deliveryParams = z.object({
  slug,
  lessonSlug: trimmedString(160, 'Bài học'),
  cohortId: cohortIdSegment,
});

const attemptParams = deliveryParams.extend({ attemptId: objectId });

const checkpointBody = z.object({
  answers: z.record(z.string(), z.unknown()).optional(),
  revision: z.coerce.number(),
});

const submitAttemptBody = z.object({
  answers: z.record(z.string(), z.unknown()).optional(),
});

const confirmQuestionBody = z.object({
  questionId: trimmedString(120, 'questionId'),
  answer: z.unknown().optional(),
});

const stagingFileBody = z.object({
  storageKey: trimmedString(512, 'storageKey'),
  url: trimmedString(2048, 'url'),
  name: z.string().trim().max(255).optional(),
  mime: z.string().trim().max(255).optional(),
  size: z.coerce.number().nonnegative().optional(),
});

const submitAssignmentBody = z.object({
  note: z.string().max(4000).optional(),
});

const eventBatchBody = z.object({
  events: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, 'events phải là mảng có dữ liệu')
    .max(100, 'Tối đa 100 events mỗi batch'),
});

module.exports = {
  deliveryParams,
  attemptParams,
  checkpointBody,
  submitAttemptBody,
  confirmQuestionBody,
  stagingFileBody,
  submitAssignmentBody,
  eventBatchBody,
};
