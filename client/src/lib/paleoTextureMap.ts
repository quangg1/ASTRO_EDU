/**
 * Map stage time (Ma) → PaleoAtlas texture.
 * CHỈ dùng texture có trong web: public/textures/paleo/ (paleo_XXX.jpg).
 * KHÔNG thêm age mới nếu chưa có file tương ứng trong thư mục đó.
 */

/** Chỉ các age (Ma) có file thực sự trong client/public/textures/paleo/ (paleo_000.jpg … paleo_750.jpg). Không mở rộng mảng này nếu chưa copy file vào web. */
export const PALEOMAP_AGES_IN_WEB: number[] = [
  0, 1, 4, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 66, 70, 75, 80, 90, 95,
  100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200,
  210, 220, 230, 240, 245, 250, 255, 260, 270, 275, 280, 290, 295, 300, 305, 310, 315, 320, 330, 340, 350, 360,
  370, 380, 390, 395, 400, 410, 415, 420, 425, 430, 440, 445, 450, 460, 461, 470, 480, 490, 500, 510, 520, 530, 540,
  600, 690, 750
]

/** Tìm age gần nhất với stageTime trong danh sách có-sẵn-trong-web (0–750 Ma). Trả về undefined nếu không có (ví dụ > 750 Ma). */
export function getClosestPaleoAge(stageTime: number): number | undefined {
  if (stageTime > 750) return undefined
  const ages = PALEOMAP_AGES_IN_WEB
  let best = ages[0]
  let bestDiff = Math.abs(stageTime - best)
  for (const age of ages) {
    const d = Math.abs(stageTime - age)
    if (d < bestDiff) {
      bestDiff = d
      best = age
    }
  }
  return best
}

/** Có dùng texture PaleoAtlas cho stage này không (chỉ khi có file tương ứng trong web). */
export function hasPaleoTexture(stageTime: number): boolean {
  if (stageTime > 750) return false
  const closest = getClosestPaleoAge(stageTime)
  if (closest === undefined) return false
  const diff = Math.abs(stageTime - closest)
  return diff <= 30 // chỉ dùng nếu lệch tối đa 30 Ma
}

import { getStaticAssetUrl } from './apiConfig'

/** Trả về path texture paleo CHỈ KHI file có trong web: /textures/paleo/paleo_XXX.jpg. Không trả về path cho thời kỳ chưa có file. */
export function getPaleoTexturePath(stageTime: number): string | null {
  const age = getClosestPaleoAge(stageTime)
  if (age === undefined) return null
  const diff = Math.abs(stageTime - age)
  if (diff > 30) return null
  return getStaticAssetUrl(`/textures/paleo/paleo_${String(age).padStart(3, '0')}.jpg`)
}
