const { z, schemas } = require('../../../shared/http');

const { trimmedString } = schemas;

/** Batch lớn hơn mức này thường là client lỗi vòng lặp gửi lại. */
const MAX_EVENTS_PER_BATCH = 100;

const looseObject = z.record(z.string(), z.unknown());

// Tiến độ được hợp nhất theo từng trường: phân biệt "không gửi" với "gửi rỗng",
// còn giá trị sai kiểu vẫn được service quy về danh sách rỗng như trước.
const idArray = z.unknown().optional();

const lessonIdParams = z.object({ lessonId: trimmedString(200, 'lessonId') });

const savePathBody = z.object({
  modules: z.array(looseObject, { message: 'modules phải là mảng' }),
  concepts: z.array(looseObject).optional(),
  published: z.boolean().optional(),
});

const generateQuizBody = z.object({
  lesson: looseObject.catch({}).default({}),
});

const submitRecallQuizBody = z.object({
  answers: looseObject.catch({}).default({}),
});

const saveProgressBody = z.object({
  completedLessonIds: idArray,
  masteredLessonIds: idArray,
  visited3DLessonIds: idArray,
  lastLessonId: z.unknown().optional(),
});

const saveSolarProgressBody = z.object({
  completedMilestoneIds: idArray,
});

const attributeSessionBody = z.object({
  anonSessionId: z
    .string()
    .trim()
    .catch('')
    .default(''),
});

const eventBatchBody = z.object({
  events: z
    .array(looseObject, { message: 'events phải là mảng có dữ liệu' })
    .min(1, 'events phải là mảng có dữ liệu')
    .max(MAX_EVENTS_PER_BATCH, `Tối đa ${MAX_EVENTS_PER_BATCH} events mỗi batch`),
});

module.exports = {
  MAX_EVENTS_PER_BATCH,
  lessonIdParams,
  savePathBody,
  generateQuizBody,
  submitRecallQuizBody,
  saveProgressBody,
  saveSolarProgressBody,
  attributeSessionBody,
  eventBatchBody,
};
