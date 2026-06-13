'use client'

import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import {
  equatorialToHorizontal,
  equatorialToSceneVector,
  horizontalToUnitVector,
  type SkyObserver,
} from '@/features/explore/lib/skyObserver'
import { ALL_STARS, type CatalogStar } from '@/features/explore/data/starCatalog'
import { getHipBrightCatalogSync } from '@/features/explore/lib/hipBrightCatalogCache'
import { getSkyLandscapeUrls, getSkyMilkywayUrls } from '@/features/explore/lib/skyAssets'
import {
  applyHorizonReddening,
  atmosphericExtinction,
  includeInStarPointCloud,
  starBaseOpacityFromMag,
  starColorRgb,
  starGlowFactor,
  starPointCanvasSize,
  starTwinklePhase,
} from '@/features/explore/lib/skyStarStyle'

const SKY_RADIUS = 500

let cachedStarPointTexture: THREE.CanvasTexture | null = null
let cachedGlowTexture: THREE.CanvasTexture | null = null

/** Texture tròn mềm — tránh sao vuông (WebGL Points mặc định). */
export function getStarPointTexture(): THREE.CanvasTexture {
  if (cachedStarPointTexture) return cachedStarPointTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    cachedStarPointTexture = new THREE.CanvasTexture(canvas)
    return cachedStarPointTexture
  }
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.06, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.14, 'rgba(240,248,255,0.55)')
  g.addColorStop(0.35, 'rgba(220,235,255,0.15)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  cachedStarPointTexture = tex
  return tex
}

export function getGlowSpriteTexture(): THREE.CanvasTexture {
  if (cachedGlowTexture) return cachedGlowTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    cachedGlowTexture = new THREE.CanvasTexture(canvas)
    return cachedGlowTexture
  }
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.08, 'rgba(255,255,240,0.55)')
  g.addColorStop(0.25, 'rgba(255,255,200,0.15)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.03)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  cachedGlowTexture = tex
  return tex
}

/** Gradient vòm trời: chân trời → zenith. */
export function useSkyDomeTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const g = ctx.createLinearGradient(0, 512, 0, 0)
    g.addColorStop(0, '#1a2835')
    g.addColorStop(0.06, '#1e3340')
    g.addColorStop(0.15, '#152a48')
    g.addColorStop(0.4, '#0c1e38')
    g.addColorStop(0.7, '#081628')
    g.addColorStop(1, '#040810')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 8, 512)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

/** Zoom sâu nhất (~28°) — đủ gần để đọc tên sao mờ trong chòm sao. */
export const SKY_FOV_MIN_DEG = 28
/** Stellarium Web thường ~185°; stereographic an toàn tới ~150°. */
export const SKY_FOV_MAX_DEG = 150
/** Mặc định hơi zoom (~86°) — Ngân Hà rõ ngay lần đầu mở; vẫn zoom ra tới 150°. */
export const SKY_FOV_DEFAULT_DEG = 86

function configureLandscapeTexture(tex: THREE.Texture) {
  tex.format = THREE.RGBAFormat
  tex.premultiplyAlpha = false
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
}

/** Panorama Stellarium — không dùng procedural (tránh dải răng cưa). */
export function useLandscapePanoramaTexture(): {
  texture: THREE.Texture | null
  loaded: boolean
  sourceUrl: string | null
} {
  const [state, setState] = useState<{
    texture: THREE.Texture | null
    loaded: boolean
    sourceUrl: string | null
  }>({ texture: null, loaded: false, sourceUrl: null })

  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    let urlIndex = 0

    const tryNext = () => {
      const landscapeUrls = getSkyLandscapeUrls()
      if (cancelled || urlIndex >= landscapeUrls.length) return
      const url = landscapeUrls[urlIndex]
      urlIndex += 1
      loader.load(
        url,
        (tex) => {
          if (cancelled) {
            tex.dispose()
            return
          }
          configureLandscapeTexture(tex)
          setState({ texture: tex, loaded: true, sourceUrl: url })
        },
        undefined,
        () => tryNext(),
      )
    }

    tryNext()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/** Ưu tiên HIP (~9k sao); fallback ALL_STARS nếu chưa fetch xong. */
function resolveStarCatalog(catalogOverride?: CatalogStar[] | null): CatalogStar[] {
  if (catalogOverride && catalogOverride.length > 0) return catalogOverride
  const sync = getHipBrightCatalogSync()
  if (sync?.length) return sync
  return ALL_STARS
}

function fillStarBuffers(
  stars: CatalogStar[],
  observer: SkyObserver,
  radius: number,
  positions: number[],
  sizes: number[],
  opacities: number[],
  colors: number[],
  glows: number[],
  phases: number[],
  labeled: Array<{
    id: string
    name: string
    dir: [number, number, number]
    mag: number
    pos: [number, number, number]
  }>,
) {
  const magLimit = observer.magLimit
  for (const s of stars) {
    if (!includeInStarPointCloud(s.mag, magLimit, s.name)) continue
    const hor = equatorialToHorizontal(s.raDeg, s.decDeg, observer)
    const p = equatorialToSceneVector(s.raDeg, s.decDeg, observer)
    const pos: [number, number, number] = [p[0] * radius, p[1] * radius, p[2] * radius]
    const ext = atmosphericExtinction(hor.altDeg)
    let op = starBaseOpacityFromMag(s.mag, magLimit) * ext.opacity
    if (hor.altDeg < 0) op *= 1.35
    if (op < 0.02) continue

    positions.push(...pos)
    sizes.push(starPointCanvasSize(s.mag, magLimit))
    opacities.push(op)
    glows.push(starGlowFactor(s.mag, magLimit))
    phases.push(starTwinklePhase(s.id))

    const [cr, cg, cb] = starColorRgb(s.bv, s.spect)
    const [r, g, b] = applyHorizonReddening(cr, cg, cb, ext.redness)
    colors.push(r, g, b)

    if (s.name && s.mag <= magLimit) {
      labeled.push({ id: s.id, name: s.name, dir: p, mag: s.mag, pos })
    } else if (s.mag <= 1.8) {
      labeled.push({ id: s.id, name: s.name || s.id, dir: p, mag: s.mag, pos })
    }
  }
}

export function useCatalogStarGeometry(
  observer: SkyObserver,
  radius: number,
  catalogOverride?: CatalogStar[] | null,
) {
  return useMemo(() => {
    const positions: number[] = []
    const sizes: number[] = []
    const opacities: number[] = []
    const colors: number[] = []
    const glows: number[] = []
    const phases: number[] = []
    const labeled: Array<{
      id: string
      name: string
      dir: [number, number, number]
      mag: number
      pos: [number, number, number]
    }> = []

    const catalog = resolveStarCatalog(catalogOverride)
    fillStarBuffers(
      catalog,
      observer,
      radius,
      positions,
      sizes,
      opacities,
      colors,
      glows,
      phases,
      labeled,
    )

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))
    geom.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1))
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geom.setAttribute('glow', new THREE.Float32BufferAttribute(glows, 1))
    geom.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1))
    return { geometry: geom, labeled }
  }, [
    observer.latDeg,
    observer.lonDeg,
    observer.at.getTime(),
    observer.magLimit,
    radius,
    catalogOverride,
  ])
}

function buildProceduralMilkyWayTexture(): THREE.Texture {
  const w = 1024
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  const bandGrad = ctx.createLinearGradient(0, h * 0.28, 0, h * 0.58)
  bandGrad.addColorStop(0, 'rgba(0,0,0,0)')
  bandGrad.addColorStop(0.45, 'rgba(80,90,130,0.06)')
  bandGrad.addColorStop(0.5, 'rgba(120,130,180,0.14)')
  bandGrad.addColorStop(0.55, 'rgba(80,90,130,0.06)')
  bandGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bandGrad
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 12000; i++) {
    const x = rndMilky(i, 1) * w
    const y = rndMilky(i, 2) * h
    const band = Math.exp(-((y - h * 0.43) ** 2) / (2 * (h * 0.11) ** 2))
    if (rndMilky(i, 3) > band * 0.9) continue
    const a = 0.04 + rndMilky(i, 4) * 0.1 * band
    ctx.fillStyle = `rgba(190,200,240,${a})`
    ctx.fillRect(x, y, 1 + (i % 2), 1)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/** Layer 2 — ưu tiên `/sky/milkyway.webp`, fallback procedural. */
export function useMilkyWayTexture() {
  const [texture, setTexture] = useState<THREE.Texture>(() => buildProceduralMilkyWayTexture())

  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    let idx = 0
    const tryNext = () => {
      const milkyUrls = getSkyMilkywayUrls()
      if (cancelled || idx >= milkyUrls.length) return
      const url = milkyUrls[idx++]
      loader.load(
        url,
        (tex) => {
          if (cancelled) {
            tex.dispose()
            return
          }
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.ClampToEdgeWrapping
          tex.colorSpace = THREE.SRGBColorSpace
          tex.needsUpdate = true
          setTexture(tex)
        },
        undefined,
        () => tryNext(),
      )
    }
    tryNext()
    return () => {
      cancelled = true
    }
  }, [])

  return texture
}

function rndMilky(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return s - Math.floor(s)
}

export function buildAzimuthalGridGeometry(radius: number): THREE.BufferGeometry {
  const segments: number[] = []
  const push = (altRad: number, az1: number, az2: number) => {
    const a = horizontalToUnitVector(altRad, az1)
    const b = horizontalToUnitVector(altRad, az2)
    segments.push(
      a[0] * radius,
      a[1] * radius,
      a[2] * radius,
      b[0] * radius,
      b[1] * radius,
      b[2] * radius,
    )
  }

  for (const altDeg of [-75, -60, -45, -30, -15, 15, 30, 45, 60, 75]) {
    const alt = (altDeg * Math.PI) / 180
    for (let az = 0; az < 360; az += 8) {
      push(alt, (az * Math.PI) / 180, ((az + 8) * Math.PI) / 180)
    }
  }

  for (const azDeg of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]) {
    const az = (azDeg * Math.PI) / 180
    for (let alt = -80; alt < 85; alt += 8) {
      const a1 = (alt * Math.PI) / 180
      const a2 = ((alt + 8) * Math.PI) / 180
      const v1 = horizontalToUnitVector(a1, az)
      const v2 = horizontalToUnitVector(a2, az)
      segments.push(
        v1[0] * radius,
        v1[1] * radius,
        v1[2] * radius,
        v2[0] * radius,
        v2[1] * radius,
        v2[2] * radius,
      )
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3))
  return geom
}

export const SKY_SCENE_RADIUS = SKY_RADIUS
/** @deprecated Dùng `SKY_FOV_DEFAULT_DEG` hoặc state zoom trong scene. */
export const SKY_FOV_DEG = SKY_FOV_DEFAULT_DEG

/** Đường kính vòng fisheye — tối đa hóa dưới header 3.5rem. */
export const SKY_DISC_SIZE_CSS =
  'min(100vw, calc(100vh - 3.5rem), calc(100dvh - 3.5rem))'
