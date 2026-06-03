import { getSkyAssetUrl, SKY_BAHIA_CADIZ_LANDSCAPE_PATH } from './skyAssets'

/** Cấu hình gói landscape Stellarium (`landscape.ini` + `maptex`). */
export type SkyLandscapePackConfig = {
  id: string
  maptexUrl: string
  /** `angle_rotatez` trong landscape.ini (độ). */
  angleRotateZDeg: number
  /** Nhân sáng texture (Stellarium `minimal_brightness` / brightness). */
  brightness: number
  name?: string
}

/** Pack đang dùng — `client/public/sky/bahia_de_cadiz/`. */
export const SKY_ACTIVE_LANDSCAPE: SkyLandscapePackConfig = {
  id: 'bahia_de_cadiz',
  maptexUrl: getSkyAssetUrl(SKY_BAHIA_CADIZ_LANDSCAPE_PATH),
  angleRotateZDeg: 0,
  brightness: 0.72,
  name: 'Bahia de Cádiz',
}
