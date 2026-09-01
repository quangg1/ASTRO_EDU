const { z, schemas } = require('../../../shared/http');

const { trimmedString } = schemas;

const listQuery = z.object({
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  q: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => value || undefined),
});

const createBody = z.object({
  title: trimmedString(300, 'Tiêu đề'),
  slug: trimmedString(200, 'Slug'),
  summary: z.string().max(2000).optional().default(''),
  categoryId: z
    .string()
    .nullish()
    .transform((value) => value || null),
  readTime: z.coerce.number().catch(5).default(5),
  tags: z.array(z.string()).catch([]).default([]),
  sections: z.array(z.unknown()).catch([]).default([]),
  relatedSlugs: z.array(z.string()).catch([]).default([]),
  published: z.boolean().catch(false).default(false),
});

/**
 * Editor lưu từng phần: field vắng mặt hoặc sai kiểu được bỏ qua thay vì báo
 * lỗi, nên mỗi field tự quyết định "có giá trị mới hay không" (undefined = giữ nguyên).
 */
const keepIfString = z
  .unknown()
  .optional()
  .transform((value) => (typeof value === 'string' ? value : undefined));

const keepIfArray = z
  .unknown()
  .optional()
  .transform((value) => (Array.isArray(value) ? value : undefined));

const updateBody = z.object({
  title: z
    .unknown()
    .optional()
    .transform((value) =>
      typeof value === 'string' && value.trim() ? value.trim() : undefined,
    ),
  summary: keepIfString,
  categoryId: z
    .unknown()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null)),
  readTime: z
    .unknown()
    .optional()
    .transform((value) => (value == null ? undefined : Number(value) || 5)),
  tags: keepIfArray,
  sections: keepIfArray,
  relatedSlugs: keepIfArray,
  published: z
    .unknown()
    .optional()
    .transform((value) => (typeof value === 'boolean' ? value : undefined)),
});

module.exports = { listQuery, createBody, updateBody };
