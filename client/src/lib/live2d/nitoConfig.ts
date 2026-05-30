import { getStaticAssetUrl } from '@/lib/apiConfig'

/** Live2D display sizes — CosmoAssistantWidget layout modes. */
export const NITO_SIZE = {
  /** Launcher góc màn hình khi chat đóng */
  peek: { width: 148, height: 188 },
  /** Trung tâm khung chat khi chưa có tin nhắn */
  hero: { width: 228, height: 288 },
  /** Cột trái khi đang chat — không đè lên bubble */
  dock: { width: 132, height: 168 },
} as const

/** Chiều rộng rail mascot (cột trái panel chat) */
export const NITO_DOCK_RAIL_WIDTH = 140

/** Path on CDN / `client/public` — sync: `scripts/sync-media-to-s3.*` */
export const NITO_MODEL_PATH = '/live2d/nito.model3.json'
export const NITO_CUBISM_CORE_PATH = '/live2d/scripts/live2dcubismcore.min.js'

export function getNitoModelUrl(): string {
  return getStaticAssetUrl(NITO_MODEL_PATH)
}

export function getNitoModelLocalUrl(): string {
  return NITO_MODEL_PATH
}

export function getCubismCoreScriptUrl(): string {
  return getStaticAssetUrl(NITO_CUBISM_CORE_PATH)
}

export function getCubismCoreScriptLocalUrl(): string {
  return NITO_CUBISM_CORE_PATH
}

export const NITO_IDLE_MOTION = { group: 'Idle', index: 0 } as const

/** Motion groups from nito.model3.json — use indices when calling model.motion(). */
export const NITO_MOTIONS = {
  Idle: ['00_idle', '05_fun', '14_ sigh', '20_sleep'],
  FlickUp: ['07_bye', '01_happy', '16_menace'],
  Tap: ['02_angry', '08_sad', '13_cry', '15_joy', '17_yes'],
  FlickDown: ['11_muscle', '03_fear'],
  FlickRight: ['04_surprise'],
  Flick3: ['06_love', '09_yawn'],
  FlickLeft: ['10_yeah', '19_walk'],
  Shake: ['12_stagger', '18_no'],
} as const

/** CDN first, then same-origin — for Live2DModel.from(). */
export function getNitoModelLoadCandidates(): string[] {
  const cdn = getNitoModelUrl()
  const local = getNitoModelLocalUrl()
  return cdn === local ? [local] : [cdn, local]
}

/** CDN first, then local script, then Live2D official CDN. */
export function getCubismCoreScriptCandidates(): string[] {
  const cdn = getCubismCoreScriptUrl()
  const local = getCubismCoreScriptLocalUrl()
  const official = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'
  const out = cdn === local ? [local] : [cdn, local]
  if (!out.includes(official)) out.push(official)
  return out
}
