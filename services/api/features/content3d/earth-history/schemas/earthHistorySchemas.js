const { z, schemas } = require('../../../../shared/http');

const { trimmedString } = schemas;

const locale = z
  .string()
  .trim()
  .optional()
  .transform((value) => (String(value || 'vi').toLowerCase() === 'en' ? 'en' : 'vi'));

// Query luôn là chuỗi, nên ép kiểu thủ công để `?maxMa=` (rỗng) vẫn bị coi là
// thiếu tham số thay vì bị Number() biến thành 0.
const requiredMa = (label) =>
  z
    .string({ message: `${label} are required` })
    .trim()
    .min(1, `${label} are required`)
    .transform(Number)
    .refine(Number.isFinite, `${label} must be numbers`);

const optionalMa = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : null))
  .transform((value) => (Number.isFinite(value) ? value : null));

const boundedInt = (fallback, max) =>
  z.coerce
    .number()
    .int()
    .catch(fallback)
    .default(fallback)
    .transform((value) => Math.min(Math.max(value, 1), max));

const stageIdParams = z.object({
  id: z.coerce.number({ message: 'stageId không hợp lệ' }).int(),
});

const stageIdPathParams = z.object({
  stageId: z.coerce.number({ message: 'stageId không hợp lệ' }).int(),
});

const eonParams = z.object({
  eon: trimmedString(40, 'eon'),
});

const timeRangeQuery = z.object({
  start: z.coerce.number().catch(4600).default(4600),
  end: z.coerce.number().catch(0).default(0),
});

const bulkStagesBody = z.object({
  stages: z.array(z.record(z.string(), z.unknown())).catch([]).default([]),
});

const fossilsByTimeQuery = z.object({
  maxMa: requiredMa('maxMa and minMa'),
  minMa: requiredMa('maxMa and minMa'),
  limit: boundedInt(2000, 5000),
  locale,
});

const fossilSearchQuery = z.object({
  q: z
    .string()
    .trim()
    .catch('')
    .default(''),
  limit: boundedInt(50, 100),
  locale,
  maxMa: optionalMa,
  minMa: optionalMa,
});

const fossilsForStageQuery = z.object({
  limit: boundedInt(500, 5000),
  locale,
});

const localeQuery = z.object({ locale });

module.exports = {
  stageIdParams,
  stageIdPathParams,
  eonParams,
  timeRangeQuery,
  bulkStagesBody,
  fossilsByTimeQuery,
  fossilSearchQuery,
  fossilsForStageQuery,
  localeQuery,
};
