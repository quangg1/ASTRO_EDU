export * from '@/features/content3d/earth/lib/earthHistoryTypes'

// API Response (generic shared primitive)
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  count?: number
  total?: number
}
