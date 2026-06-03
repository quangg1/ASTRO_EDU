/**
 * Chiếu Alt/Az → màn hình (all-sky, zenith ở tâm).
 * Stellarium Web dùng stereographic 185° trong shader; hàm này cho overlay 2D / debug.
 */

export type AltAzDeg = { altDeg: number; azDeg: number }

/** Orthographic zenith map: r=0 thiên đỉnh, r=R chân trời, r>R dưới chân trời. */
export function altAzToScreen(
  altDeg: number,
  azDeg: number,
  cx: number,
  cy: number,
  R: number,
): { x: number; y: number; belowHorizon: boolean } {
  const altRad = (altDeg * Math.PI) / 180
  const azRad = (azDeg * Math.PI) / 180
  const r = Math.cos(altRad) * R
  return {
    x: cx + r * Math.sin(azRad),
    y: cy - r * Math.cos(azRad),
    belowHorizon: altDeg < 0,
  }
}

/** Độ (0–360) → rad, az từ Bắc qua Đông. */
export function azDegToRad(azDeg: number): number {
  return (azDeg * Math.PI) / 180
}

export function altDegToRad(altDeg: number): number {
  return (altDeg * Math.PI) / 180
}
