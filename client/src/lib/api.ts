import { Fossil, FossilStats, ApiResponse } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface PhylumInfoFromApi {
  nameVi: string
  description: string
  color: string
}

export interface FossilsByTimeResult {
  fossils: Fossil[]
  total: number
}

// Fetch fossils by time range. total = số thật trong DB, fossils = mẫu để hiển thị 3D (tối đa 2000).
export async function fetchFossilsByTime(
  maxMa: number, 
  minMa: number, 
  limit: number = 2000
): Promise<FossilsByTimeResult> {
  try {
    const response = await fetch(
      `${API_BASE}/fossils/by-time?maxMa=${maxMa}&minMa=${minMa}&limit=${limit}`
    )
    const result = await response.json()
    
    if (result.success && result.data) {
      return {
        fossils: result.data,
        total: typeof result.total === 'number' ? result.total : result.data.length
      }
    }
    return { fossils: [], total: 0 }
  } catch (error) {
    console.error('Error fetching fossils:', error)
    return { fossils: [], total: 0 }
  }
}

// Fetch fossil stats
export async function fetchFossilStats(): Promise<FossilStats | null> {
  try {
    const response = await fetch(`${API_BASE}/fossils/stats`)
    const result = await response.json()
    
    if (result.success && result.data) {
      return result.data
    }
    return null
  } catch (error) {
    console.error('Error fetching fossil stats:', error)
    return null
  }
}

// Buffer fallback khi stage chưa có maxMa/minMa. Dùng khoảng rộng để không bỏ sót hóa thạch.
const QUATERNARY_BUFFER_MA = 2.6
const PHANEROZOIC_BUFFER_MA = 50

/** Tính khoảng thời gian (Ma) để query hóa thạch cho một stage. maxMa = già hơn, minMa = trẻ hơn. */
export function getFossilTimeRangeForStage(stage: { time: number; maxMa?: number; minMa?: number }): { maxMa: number; minMa: number } | null {
  if (stage.time > 600) return null
  if (stage.maxMa != null && stage.minMa != null) {
    const a = stage.maxMa
    const b = stage.minMa
    return { maxMa: Math.max(a, b), minMa: Math.min(a, b) }
  }
  const stageTime = stage.time
  let maxMa: number
  let minMa: number
  if (stageTime < 1) {
    maxMa = stageTime + QUATERNARY_BUFFER_MA
    minMa = Math.max(0, stageTime - QUATERNARY_BUFFER_MA)
  } else {
    const buffer = Math.max(stageTime * 0.15, PHANEROZOIC_BUFFER_MA)
    maxMa = stageTime + buffer
    minMa = Math.max(0, stageTime - buffer)
  }
  return { maxMa, minMa }
}

// Fetch fossils for a specific stage. Dùng stage.maxMa/minMa nếu có (ranh giới kỷ chuẩn), nếu không dùng time ± buffer.
export async function fetchFossilsForStage(
  stage: { time: number; name: string; maxMa?: number; minMa?: number }
): Promise<FossilsByTimeResult> {
  const range = getFossilTimeRangeForStage(stage)
  if (!range) return { fossils: [], total: 0 }
  const { maxMa, minMa } = range
  if (maxMa < minMa) return { fossils: [], total: 0 }
  return fetchFossilsByTime(maxMa, minMa, 2000)
}

// Metadata phylum (nameVi, description, color) từ MongoDB — dùng cho UI và sau này admin.
export async function fetchPhylumMetadata(locale: string = 'vi'): Promise<Record<string, PhylumInfoFromApi>> {
  try {
    const response = await fetch(`${API_BASE}/phyla?locale=${encodeURIComponent(locale)}`)
    const result = await response.json()
    if (result.success && result.data && typeof result.data === 'object') {
      return result.data
    }
    return {}
  } catch (error) {
    console.error('Error fetching phylum metadata:', error)
    return {}
  }
}

// Search fossils by name. Chỉ trong kỷ đang xem nếu truyền timeRange.
export async function searchFossils(
  query: string,
  timeRange?: { maxMa: number; minMa: number }
): Promise<Fossil[]> {
  try {
    const params = new URLSearchParams({ q: query })
    if (timeRange != null) {
      params.set('maxMa', String(timeRange.maxMa))
      params.set('minMa', String(timeRange.minMa))
    }
    const response = await fetch(`${API_BASE}/fossils/search?${params.toString()}`)
    const result: ApiResponse<Fossil[]> = await response.json()
    
    if (result.success && result.data) {
      return result.data
    }
    return []
  } catch (error) {
    console.error('Error searching fossils:', error)
    return []
  }
}
