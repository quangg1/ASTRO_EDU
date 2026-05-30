import { getCubismCoreScriptCandidates } from '@/lib/live2d/nitoConfig'

let loadPromise: Promise<void> | null = null

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as Window & { Live2DCubismCore?: unknown }).Live2DCubismCore) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[data-live2d-cubism-core="${src}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Cubism Core failed: ${src}`)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.live2dCubismCore = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Cubism Core failed: ${src}`))
    document.head.appendChild(script)
  })
}

/** Loads Live2D Cubism Core once (CDN → local → official CDN). */
export function loadCubismCore(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const candidates = getCubismCoreScriptCandidates()
    let lastError: Error | null = null
    for (const src of candidates) {
      try {
        await injectScript(src)
        return
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
      }
    }
    throw lastError ?? new Error('Cubism Core failed to load')
  })()
  return loadPromise
}
