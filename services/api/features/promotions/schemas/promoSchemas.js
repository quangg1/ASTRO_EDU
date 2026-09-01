const { z, schemas } = require('../../../shared/http');

const { objectId, trimmedString } = schemas;

/** Banner site-wide chỉ hiển thị được vài campaign một lúc. */
const MAX_ACTIVE_LIMIT = 12;

const activeQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .catch(5)
    .default(5)
    .transform((value) => Math.min(MAX_ACTIVE_LIMIT, Math.max(1, value))),
});

const courseIdParams = z.object({ courseId: objectId });

const validateBody = z.object({
  code: trimmedString(64, 'code'),
  courseId: objectId,
});

const promoIdParams = z.object({ id: objectId });

/** Thân đơn quản trị được chuẩn hóa ở service nên đây chỉ chặn hình dạng. */
const promoBody = z.record(z.string(), z.unknown());

module.exports = { activeQuery, courseIdParams, validateBody, promoIdParams, promoBody };
