"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseEditorListResponseSchema = exports.CourseEditorListItemSchema = void 0;
exports.parseCourseEditorListResponse = parseCourseEditorListResponse;
const zod_1 = require("zod");
/** Row from GET /courses/editor/list — studio course picker. */
exports.CourseEditorListItemSchema = zod_1.z.object({
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(String),
    title: zod_1.z.string(),
    slug: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().default(''),
    thumbnail: zod_1.z.string().nullable().optional(),
    level: zod_1.z.string(),
    lessonCount: zod_1.z.number().int().nonnegative().optional(),
    published: zod_1.z.boolean().optional().default(false),
    price: zod_1.z.number().optional(),
    currency: zod_1.z.string().optional(),
    isPaid: zod_1.z.boolean().optional(),
    durationWeeks: zod_1.z.number().nullable().optional(),
    requiresPayment: zod_1.z.boolean().optional(),
    catalogEnabled: zod_1.z.boolean().optional(),
    distributionStrategy: zod_1.z.enum(['self_paced', 'instructor_led', 'hybrid']).optional(),
});
exports.CourseEditorListResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(exports.CourseEditorListItemSchema),
});
function parseCourseEditorListResponse(payload) {
    const parsed = exports.CourseEditorListResponseSchema.safeParse(payload);
    if (!parsed.success) {
        throw new Error(`Invalid course editor list response: ${parsed.error.message}`);
    }
    return parsed.data.data;
}
