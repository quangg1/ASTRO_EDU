"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GemWalletResponseSchema = exports.GemWalletDataSchema = exports.GemTransactionSchema = void 0;
exports.parseGemWalletResponse = parseGemWalletResponse;
const zod_1 = require("zod");
exports.GemTransactionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    amount: zod_1.z.number().finite(),
    reason: zod_1.z.string(),
    type: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    meta: zod_1.z
        .object({
        lessonId: zod_1.z.string().optional(),
        entityId: zod_1.z.string().optional(),
        depth: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.GemWalletDataSchema = zod_1.z.object({
    balance: zod_1.z.number().finite(),
    level: zod_1.z.number().int().optional(),
    totalGemsEarned: zod_1.z.number().finite().optional(),
    /** Learner tier progress — shape from learnerTierService (client-only display). */
    learnerTier: zod_1.z.unknown().optional(),
    transactions: zod_1.z.array(exports.GemTransactionSchema),
});
exports.GemWalletResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: exports.GemWalletDataSchema,
});
function parseGemWalletResponse(payload) {
    const parsed = exports.GemWalletResponseSchema.safeParse(payload);
    if (!parsed.success) {
        throw new Error(`Invalid gem wallet response: ${parsed.error.message}`);
    }
    return parsed.data.data;
}
