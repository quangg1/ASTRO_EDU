'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SunSkyState } from '@/features/explore/lib/skyAstronomy'
import type { SkyViewState } from './skyViewState'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { STEREO_ASPECT_FN, STEREO_SCREEN_VERTEX } from './stereographicGlsl'

type Props = {
  sun: SunSkyState
  view: SkyViewState
}

/**
 * Gradient trời ban ngày / hoàng hôn — gắn màn hình, chỉ lệch theo góc ngước (viewAlt).
 * Không xoay theo kéo ngang (mô phỏng vòm trời quanh người quan sát).
 */
export function ScreenDaySky({ sun, view }: Props) {
  const { size } = useThree()
  const uniformsRef = useRef({
    uSunAlt: { value: sun.altDeg },
    uDay: { value: sun.dayFactor },
    uViewAltRad: { value: view.viewAltRad },
    uAspect: { value: 1 },
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        depthWrite: false,
        depthTest: false,
        uniforms: uniformsRef.current,
        vertexShader: STEREO_SCREEN_VERTEX,
        fragmentShader: /* glsl */ `
          ${STEREO_ASPECT_FN}
          uniform float uSunAlt;
          uniform float uDay;
          uniform float uViewAltRad;
          varying vec2 vNdc;

          float screenElev(vec2 ndc) {
            float horizonY = -sin(uViewAltRad) * 0.58;
            return (ndc.y - horizonY) / max(0.22, 1.0 - horizonY);
          }

          float discEdgeFade(vec2 clipNdc) {
            float r = stereoRadius(clipNdc);
            return 1.0 - smoothstep(0.96, 1.0, r);
          }

          void main() {
            if (stereoRadius(vNdc) > 1.0) discard;
            float elev = screenElev(vNdc);
            if (elev <= 0.0) discard;

            float t = pow(clamp(elev, 0.0, 1.0), 0.72);

            vec3 nightHorizon = vec3(0.07, 0.11, 0.20);
            vec3 nightZenith = vec3(0.015, 0.025, 0.055);
            vec3 dayHorizon = vec3(0.78, 0.86, 0.94);
            vec3 dayZenith = vec3(0.38, 0.58, 0.90);
            vec3 horizon = nightHorizon;
            vec3 zenith = nightZenith;

            if (uSunAlt < -12.0) {
              horizon = vec3(0.06, 0.09, 0.16);
              zenith = vec3(0.008, 0.012, 0.028);
            } else if (uSunAlt < 6.0) {
              float tw = clamp((uSunAlt + 12.0) / 18.0, 0.0, 1.0);
              horizon = mix(nightHorizon, vec3(0.32, 0.26, 0.30), tw * 0.75);
              zenith = mix(nightZenith, vec3(0.10, 0.16, 0.28), tw * 0.65);
            } else {
              horizon = mix(nightHorizon, dayHorizon, uDay);
              zenith = mix(nightZenith, dayZenith, uDay);
            }

            vec3 col = mix(horizon, zenith, t);
            float lpGlow = smoothstep(0.08, 0.4, t) * (1.0 - t) * (1.0 - uDay);
            col = mix(col, vec3(0.11, 0.13, 0.21), lpGlow * 0.5);

            float haze = smoothstep(0.22, 0.0, elev) * smoothstep(0.0, 0.12, elev);
            vec3 warm = vec3(0.22, 0.14, 0.08);
            col += warm * haze * 0.18 * (1.0 - uDay * 0.85);

            col *= discEdgeFade(vNdc);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )

  useFrame(() => {
    const u = uniformsRef.current
    u.uSunAlt.value = sun.altDeg
    u.uDay.value = sun.dayFactor
    u.uViewAltRad.value = view.viewAltRad
    u.uAspect.value = size.width / Math.max(size.height, 1)
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.atmosphere} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
