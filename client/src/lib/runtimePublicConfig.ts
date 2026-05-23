/** Injected in root layout from server env (works when NEXT_PUBLIC_* was empty at build). */
export type GalaxiesPublicRuntimeConfig = {
  apiBase: string
  mediaCdn: string
}

declare global {
  interface Window {
    __GALAXIES_PUBLIC_CONFIG__?: GalaxiesPublicRuntimeConfig
  }
}

export function readRuntimePublicConfig(): GalaxiesPublicRuntimeConfig | null {
  if (typeof window === 'undefined') return null
  const cfg = window.__GALAXIES_PUBLIC_CONFIG__
  if (!cfg || typeof cfg !== 'object') return null
  return cfg
}
