'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SkyViewState } from './skyViewState'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { STEREO_ASPECT_FN, STEREO_SCREEN_VERTEX } from './stereographicGlsl'

type Props = {
  cloudCoverPct: number
  isDay: boolean
  view: SkyViewState
}

/**
 * Mây gắn màn hình + drift — không xoay theo camera pan.
 * Chỉ dùng ban ngày / hoàng hôn (caller kiểm soát).
 */
export function SkyCloudLayer({ cloudCoverPct, isDay, view }: Props) {
  const { size } = useThree()
  const cover = Math.max(0, Math.min(100, cloudCoverPct))
  const uniformsRef = useRef({
    uCover: { value: cover / 100 },
    uDay: { value: isDay ? 1 : 0 },
    uTime: { value: 0 },
    uViewAltRad: { value: view.viewAltRad },
    uAspect: { value: 1 },
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: uniformsRef.current,
        vertexShader: STEREO_SCREEN_VERTEX,
        fragmentShader: /* glsl */ `
          ${STEREO_ASPECT_FN}
          uniform float uCover;
          uniform float uDay;
          uniform float uTime;
          uniform float uViewAltRad;
          varying vec2 vNdc;

          float screenElev(vec2 ndc) {
            float horizonY = -sin(uViewAltRad) * 0.58;
            return (ndc.y - horizonY) / max(0.22, 1.0 - horizonY);
          }

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }

          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 4; i++) {
              v += a * noise(p);
              p *= 2.05;
              a *= 0.5;
            }
            return v;
          }

          void main() {
            if (stereoRadius(vNdc) > 1.0) discard;
            float elev = screenElev(vNdc);
            if (elev <= 0.0) discard;

            vec2 uv = vNdc * 2.4;
            uv.x += uTime * 0.01;
            uv.y += uTime * 0.0022;

            float n = fbm(uv * 2.6);
            float streak = fbm(uv * 1.1 + vec2(uTime * 0.0045, 0.0));

            float density = smoothstep(0.38, 0.76, n * 0.72 + streak * 0.38);
            density *= uCover * mix(0.48, 0.88, uDay);
            density *= smoothstep(0.04, 0.3, elev);

            vec3 cloudCol = mix(vec3(0.48, 0.51, 0.55), vec3(0.9, 0.92, 0.96), uDay);
            float alpha = density * mix(0.3, 0.58, uDay);
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(cloudCol, alpha);
          }
        `,
      }),
    [],
  )

  useFrame((state) => {
    const u = uniformsRef.current
    u.uTime.value = state.clock.elapsedTime
    u.uCover.value = cover / 100
    u.uDay.value = isDay ? 1 : 0
    u.uViewAltRad.value = view.viewAltRad
    u.uAspect.value = size.width / Math.max(size.height, 1)
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.clouds} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
