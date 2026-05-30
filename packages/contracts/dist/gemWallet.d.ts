import { z } from 'zod';
export declare const GemTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    amount: z.ZodNumber;
    reason: z.ZodString;
    type: z.ZodString;
    createdAt: z.ZodString;
    meta: z.ZodOptional<z.ZodObject<{
        lessonId: z.ZodOptional<z.ZodString>;
        entityId: z.ZodOptional<z.ZodString>;
        depth: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lessonId?: string | undefined;
        entityId?: string | undefined;
        depth?: string | undefined;
    }, {
        lessonId?: string | undefined;
        entityId?: string | undefined;
        depth?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
    meta?: {
        lessonId?: string | undefined;
        entityId?: string | undefined;
        depth?: string | undefined;
    } | undefined;
}, {
    type: string;
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
    meta?: {
        lessonId?: string | undefined;
        entityId?: string | undefined;
        depth?: string | undefined;
    } | undefined;
}>;
export type GemTransaction = z.infer<typeof GemTransactionSchema>;
export declare const GemWalletDataSchema: z.ZodObject<{
    balance: z.ZodNumber;
    level: z.ZodOptional<z.ZodNumber>;
    totalGemsEarned: z.ZodOptional<z.ZodNumber>;
    /** Learner tier progress — shape from learnerTierService (client-only display). */
    learnerTier: z.ZodOptional<z.ZodUnknown>;
    transactions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        amount: z.ZodNumber;
        reason: z.ZodString;
        type: z.ZodString;
        createdAt: z.ZodString;
        meta: z.ZodOptional<z.ZodObject<{
            lessonId: z.ZodOptional<z.ZodString>;
            entityId: z.ZodOptional<z.ZodString>;
            depth: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            lessonId?: string | undefined;
            entityId?: string | undefined;
            depth?: string | undefined;
        }, {
            lessonId?: string | undefined;
            entityId?: string | undefined;
            depth?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        amount: number;
        reason: string;
        createdAt: string;
        meta?: {
            lessonId?: string | undefined;
            entityId?: string | undefined;
            depth?: string | undefined;
        } | undefined;
    }, {
        type: string;
        id: string;
        amount: number;
        reason: string;
        createdAt: string;
        meta?: {
            lessonId?: string | undefined;
            entityId?: string | undefined;
            depth?: string | undefined;
        } | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    balance: number;
    transactions: {
        type: string;
        id: string;
        amount: number;
        reason: string;
        createdAt: string;
        meta?: {
            lessonId?: string | undefined;
            entityId?: string | undefined;
            depth?: string | undefined;
        } | undefined;
    }[];
    level?: number | undefined;
    totalGemsEarned?: number | undefined;
    learnerTier?: unknown;
}, {
    balance: number;
    transactions: {
        type: string;
        id: string;
        amount: number;
        reason: string;
        createdAt: string;
        meta?: {
            lessonId?: string | undefined;
            entityId?: string | undefined;
            depth?: string | undefined;
        } | undefined;
    }[];
    level?: number | undefined;
    totalGemsEarned?: number | undefined;
    learnerTier?: unknown;
}>;
export type GemWalletData = z.infer<typeof GemWalletDataSchema>;
export declare const GemWalletResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodObject<{
        balance: z.ZodNumber;
        level: z.ZodOptional<z.ZodNumber>;
        totalGemsEarned: z.ZodOptional<z.ZodNumber>;
        /** Learner tier progress — shape from learnerTierService (client-only display). */
        learnerTier: z.ZodOptional<z.ZodUnknown>;
        transactions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            amount: z.ZodNumber;
            reason: z.ZodString;
            type: z.ZodString;
            createdAt: z.ZodString;
            meta: z.ZodOptional<z.ZodObject<{
                lessonId: z.ZodOptional<z.ZodString>;
                entityId: z.ZodOptional<z.ZodString>;
                depth: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            }, {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            id: string;
            amount: number;
            reason: string;
            createdAt: string;
            meta?: {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            } | undefined;
        }, {
            type: string;
            id: string;
            amount: number;
            reason: string;
            createdAt: string;
            meta?: {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            } | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        balance: number;
        transactions: {
            type: string;
            id: string;
            amount: number;
            reason: string;
            createdAt: string;
            meta?: {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            } | undefined;
        }[];
        level?: number | undefined;
        totalGemsEarned?: number | undefined;
        learnerTier?: unknown;
    }, {
        balance: number;
        transactions: {
            type: string;
            id: string;
            amount: number;
            reason: string;
            createdAt: string;
            meta?: {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            } | undefined;
        }[];
        level?: number | undefined;
        totalGemsEarned?: number | undefined;
        learnerTier?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    success: true;
    data: {
        balance: number;
        transactions: {
            type: string;
            id: string;
            amount: number;
            reason: string;
            createdAt: string;
            meta?: {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            } | undefined;
        }[];
        level?: number | undefined;
        totalGemsEarned?: number | undefined;
        learnerTier?: unknown;
    };
}, {
    success: true;
    data: {
        balance: number;
        transactions: {
            type: string;
            id: string;
            amount: number;
            reason: string;
            createdAt: string;
            meta?: {
                lessonId?: string | undefined;
                entityId?: string | undefined;
                depth?: string | undefined;
            } | undefined;
        }[];
        level?: number | undefined;
        totalGemsEarned?: number | undefined;
        learnerTier?: unknown;
    };
}>;
export declare function parseGemWalletResponse(payload: unknown): GemWalletData;
//# sourceMappingURL=gemWallet.d.ts.map