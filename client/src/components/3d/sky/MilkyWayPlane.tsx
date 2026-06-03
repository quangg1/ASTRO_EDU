'use client'

import { useLayoutEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SkyObserver } from '@/features/explore/lib/skyObserver'
import { buildSceneToEquatorialMatrix } from '@/features/explore/lib/skyEquatorial'
import { SKY_FOV_DEFAULT_DEG } from './skyVisuals'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { useStereoScreenUniforms } from './useStereoScreenUniforms'
import {
  STEREO_INVERSE_FN,
  STEREO_SCREEN_VERTEX,
  STEREO_UNIFORMS,
} from './stereographicGlsl'

type Props = {
  texture: THREE.Texture
  fovDeg: number
  observer: SkyObserver
}

/** Dải Ngân Hà — UV theo RA/Dec (`/sky/milkyway.png`, equirectangular 2:1). */
export function MilkyWayPlane({ texture, fovDeg, observer }: Props) {
  const sceneToEquat = useMemo(
    () => buildSceneToEquatorialMatrix(observer),
    [observer.latDeg, observer.lonDeg, observer.at.getTime()],
  )

  const uniforms = useStereoScreenUniforms({
    uMap: { value: texture },
    uSceneToEquat: { value: sceneToEquat.clone() },
    uBaseOpacity: { value: 0.38 },
    uFovBoost: { value: 0 },
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms,
        vertexShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_SCREEN_VERTEX}
        `,
        fragmentShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_INVERSE_FN}
          uniform sampler2D uMap;
          uniform mat3 uSceneToEquat;
          uniform float uBaseOpacity;
          uniform float uFovBoost;
          varying vec2 vNdc;
          const float PI = 3.14159265359;

          void main() {
            float r = stereoRadius(vNdc);
            if (r > 1.0) discard;

            vec3 w = worldDirFromNdc(vNdc);
            float alt = asin(clamp(w.y, -1.0, 1.0));

            vec3 eq = uSceneToEquat * w;
            float ra = atan(eq.z, eq.x);
            float dec = asin(clamp(eq.y, -1.0, 1.0));
            float u = fract(ra / (2.0 * PI) + 0.5);
            float v = 0.5 - dec / PI;

            vec4 tex = texture2D(uMap, vec2(u, v));
            float lum = max(tex.r, max(tex.g, tex.b));
            float a = max(tex.a, lum * 0.85) * uBaseOpacity * (1.0 + uFovBoost);
            a *= discEdgeFade(vNdc);
            a *= smoothstep(-1.52, 0.1, alt);
            if (a < 0.002) discard;
            gl_FragColor = vec4(tex.rgb * a * 1.15, a);
          }
        `,
      }),
    [uniforms],
  )

  useLayoutEffect(() => {
    uniforms.uMap.value = texture
    uniforms.uSceneToEquat.value.copy(sceneToEquat)
  }, [texture, sceneToEquat, uniforms])

  useFrame(() => {
    const ref = SKY_FOV_DEFAULT_DEG
    const boost = Math.max(0.15, Math.min(0.55, (ref + 40 - fovDeg) / 75))
    uniforms.uFovBoost.value = boost
    uniforms.uBaseOpacity.value = 0.34 + boost * 0.14
  })

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.milkyWay} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
