const { z } = require('zod');
const { AppError, formatZodIssues } = require('../errors');

const SOURCES = ['body', 'query', 'params'];

/**
 * Request validation middleware.
 *
 * Parsed + coerced output lands on `req.valid.{body,query,params}` so handlers
 * read trusted, typed data instead of re-sanitising `req.body` by hand.
 * `req.body` is also replaced with the parsed value for legacy handlers.
 *
 *   router.post('/', validate({ body: CreateCohortSchema }), controller.create)
 */
function validate(schemas = {}) {
  const entries = SOURCES.filter((source) => schemas[source]).map((source) => [
    source,
    schemas[source],
  ]);

  return function validateRequest(req, _res, next) {
    const valid = {};
    const fieldErrors = {};

    for (const [source, schema] of entries) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        for (const [field, messages] of Object.entries(formatZodIssues(result.error))) {
          fieldErrors[`${source}.${field}`] = messages;
        }
        continue;
      }
      valid[source] = result.data;
    }

    if (Object.keys(fieldErrors).length > 0) {
      return next(AppError.validation('Dữ liệu gửi lên không hợp lệ', fieldErrors));
    }

    req.valid = { ...(req.valid || {}), ...valid };
    if (valid.body) req.body = valid.body;
    return next();
  };
}

/** Mongo ObjectId as a 24-char hex string. */
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Định danh không hợp lệ');

/** URL-safe slug. */
const slug = z
  .string()
  .trim()
  .min(1, 'Slug là bắt buộc')
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

/** Non-empty trimmed string with a length ceiling. */
const trimmedString = (max = 255, label = 'Giá trị') =>
  z.string().trim().min(1, `${label} là bắt buộc`).max(max, `${label} quá dài (tối đa ${max})`);

/** Query-string pagination with coercion and a hard limit ceiling. */
const pagination = (defaultLimit = 20, maxLimit = 100) =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  });

/** Checkbox-style query flags: `?x=1`, `?x=true`. */
const booleanFlag = z
  .union([z.boolean(), z.enum(['1', '0', 'true', 'false'])])
  .transform((v) => v === true || v === '1' || v === 'true');

module.exports = {
  validate,
  schemas: { objectId, slug, trimmedString, pagination, booleanFlag },
  z,
};
