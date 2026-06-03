/**
 * `hip-bright.json` (build-hip-bright.mjs) lưu RA **độ** (0–360) trong field `raDeg`.
 * Không nhân 15 — heuristic cũ (ra ≤ 24.5 → giờ) làm lệch sao RA thấp (Pegasus, Aries, …).
 */
export function hipCatalogRaToDeg(raDeg: number): number {
  if (!Number.isFinite(raDeg)) return 0
  return raDeg
}
