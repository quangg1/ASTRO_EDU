'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SunSkyState } from '@/features/explore/lib/skyAstronomy'
import { SKY_RENDER_ORDER } from './skyLayers'
import { useStereographicUniforms } from './StereographicContext'
import { STEREO_PROJECT_FN, STEREO_UNIFORMS } from './stereographicGlsl'

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

export function SkyAtmosphereStereographic({ radius, sun }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const stereo = useStereographicUniforms()
  const tex = useMemo(() => buildAtmosphereTexture(sun), [sun.altDeg, sun.dayFactor])

  const uniforms = useMemo(
    () => ({
      uSkyGrad: { value: tex },
      uViewFromWorld: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 1 },
      uMaxTheta: { value: Math.PI },
    }),
    [tex],
  )

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    mat.uniforms.uViewFromWorld.value.copy(stereo.viewFromWorld)
    mat.uniforms.uTanHalfFov.value = stereo.tanHalfFov
    mat.uniforms.uMaxTheta.value = stereo.maxTheta
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.atmosphere} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 32]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        side={THREE.BackSide}
        vertexShader={/* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_PROJECT_FN}
          varying vec3 vWorldDir;
          void main() {
            vWorldDir = normalize(position);
            vec2 ndc = stereographicNdc(position);
            if (!stereographicVisible(ndc)) {
              gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            } else {
              gl_Position = vec4(ndc, 0.0, 1.0);
            }
          }
        `}
        fragmentShader={/* glsl */ `
          uniform sampler2D uSkyGrad;
          varying vec3 vWorldDir;
          void main() {
            float alt = asin(clamp(vWorldDir.y, -1.0, 1.0));
            if (alt < -0.02) discard;
            float v = alt / 1.5708;
            vec3 col = texture2D(uSkyGrad, vec2(0.5, clamp(v, 0.0, 1.0))).rgb;
            float haze = smoothstep(0.0, 0.12, alt) * (1.0 - smoothstep(0.5, 1.0, alt));
            col += vec3(0.02, 0.03, 0.05) * haze;
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  )
}
