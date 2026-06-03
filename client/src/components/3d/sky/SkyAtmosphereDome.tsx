'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { SunSkyState } from '@/features/explore/lib/skyAstronomy'

type Props = {
  radius: number
  sun: SunSkyState
}

function buildAtmosphereTexture(sun: SunSkyState): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const alt = sun.altDeg
  const day = sun.dayFactor

  const g = ctx.createLinearGradient(0, 512, 0, 0)
  if (alt < -12) {
    g.addColorStop(0, '#0f1a28')
    g.addColorStop(0.12, '#0a1420')
    g.addColorStop(0.5, '#060c14')
    g.addColorStop(1, '#020408')
  } else if (alt < 6) {
    const tw = Math.max(0, (alt + 12) / 18)
    g.addColorStop(0, `rgb(${Math.round(40 + tw * 120)},${Math.round(28 + tw * 60)},${Math.round(35 + tw * 40)})`)
    g.addColorStop(0.08, `rgb(${Math.round(25 + tw * 80)},${Math.round(35 + tw * 50)},${Math.round(55 + tw * 30)})`)
    g.addColorStop(0.35, '#0c1830')
    g.addColorStop(1, '#040810')
  } else {
    g.addColorStop(0, `rgb(${Math.round(70 + day * 50)},${Math.round(120 + day * 80)},${Math.round(180 + day * 40)})`)
    g.addColorStop(0.06, `rgb(${Math.round(40 + day * 30)},${Math.round(90 + day * 50)},${Math.round(140 + day * 30)})`)
    g.addColorStop(0.2, '#1a4070')
    g.addColorStop(0.55, '#0c2848')
    g.addColorStop(1, '#061020')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 512)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Layer 1 — gradient khí quyển theo độ cao Mặt Trời. */
export function SkyAtmosphereDome({ radius, sun }: Props) {
  const texture = useMemo(() => buildAtmosphereTexture(sun), [sun.altDeg, sun.dayFactor])

  return (
    <mesh renderOrder={0} frustumCulled={false}>
      <sphereGeometry args={[radius, 72, 56]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
