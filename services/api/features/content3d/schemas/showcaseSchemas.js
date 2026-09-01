const { z, schemas } = require('../../../shared/http');
const { ENTITY_GROUPS } = require('../lib/showcaseEntityNormalize');

const { trimmedString, booleanFlag } = schemas;

/** Hàng trong bảng editor được chuẩn hóa sâu ở tầng lib, đây chỉ chặn hình dạng. */
const looseRow = z.record(z.string(), z.unknown());

const entityRowsBody = z.object({
  items: z.array(looseRow, { message: 'items phải là mảng' }),
});

const createEntityBody = z.object({
  entityId: trimmedString(80, 'entityId'),
  name: trimmedString(200, 'name'),
  group: z.enum([...ENTITY_GROUPS], { message: 'group không hợp lệ' }),
  parentId: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || ''),
  linkedPlanetName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => value || ''),
});

const entityIdParams = z.object({
  entityId: trimmedString(80, 'entityId'),
});

const deleteEntityQuery = z.object({
  cascade: booleanFlag.optional().default(false),
});

const catalogBundleBody = z.object({
  catalog: z.array(looseRow, { message: 'Thiếu catalog, orbits hoặc stories (mảng)' }),
  orbits: z.array(looseRow, { message: 'Thiếu catalog, orbits hoặc stories (mảng)' }),
  stories: z.array(looseRow, { message: 'Thiếu catalog, orbits hoặc stories (mảng)' }),
});

const skyItemsBody = z.object({
  items: z.array(looseRow, { message: 'items phải là mảng' }),
});

const jplQuery = z.object({
  when: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => value || ''),
  // Mặc định lấy cả thiên thể con; `includeParents=0` chỉ lấy thiên thể gốc.
  includeParents: z
    .string()
    .optional()
    .transform((value) => value !== '0'),
});

/** Ngoài `entityId`/`when`, phần còn lại của body là override thủ công. */
const syncEntityBody = looseRow.and(
  z.object({
    entityId: trimmedString(80, 'entityId'),
    when: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || ''),
  }),
);

module.exports = {
  entityRowsBody,
  createEntityBody,
  entityIdParams,
  deleteEntityQuery,
  catalogBundleBody,
  skyItemsBody,
  jplQuery,
  syncEntityBody,
};
