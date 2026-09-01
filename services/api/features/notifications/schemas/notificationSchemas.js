const { z, schemas } = require('../../../shared/http');

/** Chuông thông báo chỉ hiển thị vài chục mục gần nhất. */
const DEFAULT_INBOX_LIMIT = 30;
const MAX_INBOX_LIMIT = 50;

const inboxQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .catch(DEFAULT_INBOX_LIMIT)
    .default(DEFAULT_INBOX_LIMIT)
    .transform((value) => Math.min(MAX_INBOX_LIMIT, Math.max(1, value))),
  unreadOnly: z
    .string()
    .optional()
    .transform((value) => value === '1'),
});

const notificationIdParams = z.object({ id: schemas.objectId });

module.exports = { inboxQuery, notificationIdParams };
