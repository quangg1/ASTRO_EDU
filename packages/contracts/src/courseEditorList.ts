import { z } from 'zod'

/** Row from GET /courses/editor/list — studio course picker. */
export const CourseEditorListItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  slug: z.string().min(1),
  description: z.string().optional().default(''),
  thumbnail: z.string().nullable().optional(),
  level: z.string(),
  lessonCount: z.number().int().nonnegative().optional(),
  published: z.boolean().optional().default(false),
  price: z.number().optional(),
  currency: z.string().optional(),
  isPaid: z.boolean().optional(),
  durationWeeks: z.number().nullable().optional(),
  requiresPayment: z.boolean().optional(),
  catalogEnabled: z.boolean().optional(),
  distributionStrategy: z.enum(['self_paced', 'instructor_led', 'hybrid']).optional(),
})

export type CourseEditorListItem = z.infer<typeof CourseEditorListItemSchema>

export const CourseEditorListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(CourseEditorListItemSchema),
})

export function parseCourseEditorListResponse(payload: unknown): CourseEditorListItem[] {
  const parsed = CourseEditorListResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(`Invalid course editor list response: ${parsed.error.message}`)
  }
  return parsed.data.data
}
