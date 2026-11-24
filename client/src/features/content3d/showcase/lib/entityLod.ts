/**
 * Level-of-detail cho thực thể showcase — hàm thuần, không phụ thuộc React/three để test được.
 *
 * Ý tưởng: không "ẩn" thực thể để tiết kiệm, mà vẽ mỗi thực thể bằng dạng RẺ NHẤT
 * đủ cho kích thước nó chiếm trên màn hình:
 *   - point  : < vài pixel  → gộp chung vào MỘT lớp Points (1 draw call cho hàng nghìn).
 *   - globe  : vài chục px  → quả cầu/texture nhẹ, có nhãn nếu còn ngân sách nhãn.
 *   - model  : đủ lớn       → GLB đầy đủ, nhưng chỉ cho tối đa `modelBudget` thực thể cùng lúc.
 */

export type EntityLodTier = 'point' | 'globe' | 'model'

export type LodThresholds = {
  /** Bán kính pixel để lên globe (vào) / xuống point (ra). Khác nhau để không nhấp nháy. */
  globeEnterPx: number
  globeExitPx: number
  /** Bán kính pixel để lên model (vào) / xuống globe (ra). */
  modelEnterPx: number
  modelExitPx: number
}

export const DEFAULT_LOD_THRESHOLDS: LodThresholds = {
  globeEnterPx: 3,
  globeExitPx: 2,
  modelEnterPx: 28,
  modelExitPx: 20,
}

export type LodBudgets = {
  /** Số GLB tối đa được mount cùng lúc (bộ nhớ GPU + thời gian parse). */
  modelBudget: number
  /** Số globe tối đa (mỗi globe là 1+ draw call và có thể tải texture). */
  globeBudget: number
  /** Số nhãn HTML tối đa (mỗi nhãn là 1 phần tử DOM cập nhật mỗi khung). */
  labelBudget: number
}

export const DEFAULT_LOD_BUDGETS: LodBudgets = {
  modelBudget: 6,
  globeBudget: 120,
  labelBudget: 24,
}

/** Bán kính (pixel) mà một khối cầu bán kính `worldRadius` chiếm khi cách camera `distance`. */
export function screenRadiusPx(
  worldRadius: number,
  distance: number,
  fovDeg: number,
  viewportHeightPx: number,
): number {
  if (!(distance > 0) || !(worldRadius > 0)) return distance > 0 ? 0 : Number.POSITIVE_INFINITY
  const focalPx = viewportHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360))
  return (worldRadius / distance) * focalPx
}

/** Tier "mong muốn" chỉ dựa trên kích thước màn hình, có trễ (hysteresis) theo tier trước. */
export function desiredTier(
  px: number,
  prev: EntityLodTier | undefined,
  hasModel: boolean,
  t: LodThresholds = DEFAULT_LOD_THRESHOLDS,
): EntityLodTier {
  const globeAt = prev === 'globe' || prev === 'model' ? t.globeExitPx : t.globeEnterPx
  const modelAt = prev === 'model' ? t.modelExitPx : t.modelEnterPx
  if (hasModel && px >= modelAt) return 'model'
  if (px >= globeAt) return 'globe'
  return 'point'
}

export type LodCandidate = {
  id: string
  px: number
  hasModel: boolean
  /** Thực thể đang được chọn: luôn ít nhất globe, ưu tiên model, luôn có nhãn. */
  active?: boolean
  /** Nằm sau camera hoặc ngoài khung nhìn: không tốn ngân sách globe/model/nhãn. */
  offscreen?: boolean
}

export type LodAssignment = {
  tiers: Map<string, EntityLodTier>
  labels: Set<string>
}

/**
 * Gán tier cho toàn bộ ứng viên theo ngân sách. Ưu tiên: active trước, rồi theo pixel giảm dần.
 * Thực thể vượt ngân sách bị hạ xuống tier thấp hơn (model → globe → point), không bị ẩn.
 */
export function assignLod(
  candidates: LodCandidate[],
  prevTiers: ReadonlyMap<string, EntityLodTier>,
  budgets: LodBudgets = DEFAULT_LOD_BUDGETS,
  thresholds: LodThresholds = DEFAULT_LOD_THRESHOLDS,
): LodAssignment {
  const ranked = [...candidates].sort((a, b) => {
    if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1
    return b.px - a.px
  })
  const tiers = new Map<string, EntityLodTier>()
  const labels = new Set<string>()
  let models = 0
  let globes = 0
  for (const c of ranked) {
    let want: EntityLodTier = c.offscreen && !c.active
      ? 'point'
      : desiredTier(c.px, prevTiers.get(c.id), c.hasModel, thresholds)
    // Thực thể được chọn: bắt đầu tải GLB ngay trong lúc camera bay tới.
    if (c.active) want = c.hasModel ? 'model' : 'globe'
    if (want === 'model' && models >= budgets.modelBudget) want = 'globe'
    if (want === 'globe' && globes >= budgets.globeBudget && !c.active) want = 'point'
    if (want === 'model') models++
    else if (want === 'globe') globes++
    tiers.set(c.id, want)
    if ((c.active || want !== 'point') && (c.active || labels.size < budgets.labelBudget)) labels.add(c.id)
  }
  return { tiers, labels }
}

/** So sánh hai lần gán để chỉ setState khi thật sự đổi (tránh render lại mỗi khung). */
export function sameAssignment(a: LodAssignment, b: LodAssignment): boolean {
  if (a.tiers.size !== b.tiers.size || a.labels.size !== b.labels.size) return false
  for (const [k, v] of a.tiers) if (b.tiers.get(k) !== v) return false
  for (const k of a.labels) if (!b.labels.has(k)) return false
  return true
}
