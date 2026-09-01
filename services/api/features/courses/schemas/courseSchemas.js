const { z, schemas } = require('../../../shared/http');

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const CURRENCIES = ['VND', 'USD'];
const PRICING_FILTERS = ['free', 'paid'];
const THUMBNAIL_MAX = 2048;

/**
 * Editor fields are *tolerant*: an unrecognised value is ignored (left
 * untouched on the document) rather than failing the whole save. Studio sends
 * the full form on every keystroke-driven autosave, so rejecting the payload
 * over one stale field would lose the teacher's other edits.
 */
const ignoreInvalid = (schema) => schema.optional().catch(undefined);

const optionalTrimmed = (max) =>
  ignoreInvalid(
    z
      .string()
      .trim()
      .min(1)
      .transform((value) => value.slice(0, max)),
  );

/** Present-but-empty means "clear it"; absent means "leave it alone". */
const clearableText = (max) =>
  ignoreInvalid(
    z
      .union([z.string(), z.null()])
      .transform((value) => {
        if (value === null || value.trim() === '') return null;
        return value.trim().slice(0, max);
      }),
  );

const clearableAmount = ignoreInvalid(
  z
    .union([z.number(), z.string(), z.null()])
    .transform((value) => (value === null || value === '' ? null : Math.max(0, Math.round(Number(value)) || 0))),
);

const clearableCurrency = ignoreInvalid(
  z.unknown().transform((value) => (CURRENCIES.includes(value) ? value : null)),
);

// ------------------------------------------------------------------- public

const catalogQuery = z.object({
  q: z.string().trim().max(200).optional().default(''),
  level: ignoreInvalid(
    z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.enum(LEVELS)),
  ),
  pricing: ignoreInvalid(z.string().trim().toLowerCase().pipe(z.enum(PRICING_FILTERS))),
});

const courseSlugParams = z.object({ slug: z.string().trim().min(1).max(160) });

const courseDetailQuery = z.object({
  outline: z
    .unknown()
    .optional()
    .transform((value) => String(value ?? '').trim() === '1'),
});

const createCourseBody = z.object({
  title: schemas.trimmedString(200, 'Tiêu đề khóa học'),
  slug: z.string().trim().max(160).optional(),
});

const progressBody = z.object({
  lessonSlug: schemas.trimmedString(200, 'lessonSlug'),
  // Anything other than an explicit `false` marks the lesson complete.
  completed: z
    .unknown()
    .optional()
    .transform((value) => value !== false),
});

// ------------------------------------------------------------------- editor

const materialInput = z
  .object({
    id: z.string().optional(),
    label: z.string().optional(),
    kind: z.string().optional(),
    url: z.string().optional(),
    uploadedAt: z.union([z.string(), z.number(), z.date()]).nullish(),
  })
  .loose();

const moduleInput = z
  .object({
    _id: z.string().optional(),
    title: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.union([z.number(), z.string()]).nullish(),
    materials: z.array(materialInput).optional(),
  })
  .loose();

const lessonInput = z.object({}).loose();

const editorCourseBody = z.object({
  title: optionalTrimmed(200),
  description: ignoreInvalid(z.string()),
  thumbnail: clearableText(THUMBNAIL_MAX),
  level: ignoreInvalid(z.enum(LEVELS)),
  durationWeeks: ignoreInvalid(
    z.union([z.number(), z.string(), z.null()]).transform((value) => Number(value) || null),
  ),
  published: ignoreInvalid(z.boolean()),
  price: ignoreInvalid(
    z.union([z.number(), z.string()]).transform((value) => Math.max(0, Math.floor(Number(value)) || 0)),
  ),
  currency: ignoreInvalid(z.enum(CURRENCIES)),
  isPaid: ignoreInvalid(z.boolean()),
  cohortPrice: clearableAmount,
  cohortCurrency: clearableCurrency,
  catalogEnabled: ignoreInvalid(z.boolean()),
  distributionStrategy: optionalTrimmed(64),
  crossSellTutorialHref: optionalTrimmed(512),
  crossSellTutorialLabelVi: ignoreInvalid(z.string().transform((v) => v.trim().slice(0, 200))),
  crossSellTutorialBodyVi: ignoreInvalid(z.string().transform((v) => v.trim().slice(0, 2000))),
  teacherId: ignoreInvalid(z.union([z.string(), z.null()])),
  modules: ignoreInvalid(z.array(moduleInput)),
  lessons: ignoreInvalid(z.array(lessonInput)),
});

module.exports = {
  LEVELS,
  CURRENCIES,
  catalogQuery,
  courseSlugParams,
  courseDetailQuery,
  createCourseBody,
  progressBody,
  editorCourseBody,
};
