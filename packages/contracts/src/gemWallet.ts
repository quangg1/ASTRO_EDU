import { z } from 'zod'

export const GemTransactionSchema = z.object({
  id: z.string().min(1),
  amount: z.number().finite(),
  reason: z.string(),
  type: z.string(),
  createdAt: z.string(),
  meta: z
    .object({
      lessonId: z.string().optional(),
      entityId: z.string().optional(),
      depth: z.string().optional(),
    })
    .optional(),
})

export type GemTransaction = z.infer<typeof GemTransactionSchema>

export const GemWalletDataSchema = z.object({
  balance: z.number().finite(),
  level: z.number().int().optional(),
  totalGemsEarned: z.number().finite().optional(),
  /** Learner tier progress — shape from learnerTierService (client-only display). */
  learnerTier: z.unknown().optional(),
  transactions: z.array(GemTransactionSchema),
})

export type GemWalletData = z.infer<typeof GemWalletDataSchema>

export const GemWalletResponseSchema = z.object({
  success: z.literal(true),
  data: GemWalletDataSchema,
})

export function parseGemWalletResponse(payload: unknown): GemWalletData {
  const parsed = GemWalletResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(`Invalid gem wallet response: ${parsed.error.message}`)
  }
  return parsed.data.data
}
