'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SKY_RENDER_ORDER, SKY_SHADER_GLSL1 } from './skyLayers'
import { nightSkyVisibility, type SunSkyState } from '@/features/explore/lib/skyAstronomy'
import type { SkyLandscapePackConfig } from '@/features/explore/lib/skyLandscapePack'
import type { SkyViewState } from './skyViewState'
import { effectiveLandscapeOpacity } from './skyViewState'
import { useStereoScreenUniforms } from './useStereoScreenUniforms'
import {
  STEREO_INVERSE_FN,
  STEREO_SCREEN_VERTEX,
  STEREO_UNIFORMS,
} from './stereographicGlsl'

type Props = {
  texture: THREE.Texture
  pack: SkyLandscapePackConfig
  view: SkyViewState
  sun: SunSkyState
  /** Ghim chòm — landscape mờ hơn để thấy phần chòm dưới chân trời. */
  constellationActive?: boolean
}

/** Panorama alt-az: đục khi nhìn lên; trong suốt dần chỉ khi kéo xuống dưới chân trời (Stellarium). */
export function LandscapePlane({ texture, pack, view, sun, constellationActive = false }: Props) {
  const { gl } = useThree()
  const azRot = (pack.angleRotateZDeg * Math.PI) / 180
  const uniforms = useStereoScreenUniforms({
    uMap: { value: texture },
    uDim: { value: pack.brightness },
    uAzRot: { value: azRot },
    uGroundOpacity: { value: 1 },
    uDay: { value: sun.dayFactor },
    uNightVis: { value: nightSkyVisibility(sun) },
  })

  useEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy?.() ?? 1
    texture.anisotropy = Math.min(16, max)
  }, [gl, texture])

  useFrame(() => {
    uniforms.uGroundOpacity.value = effectiveLandscapeOpacity(view, constellationActive)
    uniforms.uDay.value = sun.dayFactor
    uniforms.uNightVis.value = nightSkyVisibility(sun)
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...SKY_SHADER_GLSL1,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        uniforms,
        vertexShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_SCREEN_VERTEX}
        `,
        fragmentShader: /* glsl */ `
          ${STEREO_UNIFORMS}
          ${STEREO_INVERSE_FN}
          uniform sampler2D uMap;
          uniform float uDim;
          uniform float uAzRot;
          uniform float uGroundOpacity;
          uniform float uDay;
          uniform float uNightVis;
          varying vec2 vNdc;
          const float PI = 3.14159265359;

          void main() {
            float r = stereoRadius(vNdc);
            if (r > 1.0) discard;

            vec3 w = worldDirFromNdc(vNdc);
            float alt = asin(clamp(w.y, -1.0, 1.0));
            if (alt > 0.012) discard;

            float az = atan(w.x, -w.z);
            float u = fract(az / (2.0 * PI) + 0.5 + uAzRot / (2.0 * PI));
            float v = 0.5 + alt / PI;

            vec4 tex = texture2D(uMap, vec2(u, v));
            float alpha = tex.a * discEdgeFade(vNdc) * uGroundOpacity;
            if (alpha < 0.003) discard;
            float dim = 0.5 + 0.5 * uGroundOpacity;
            float dayBoost = mix(0.32, 2.85, uDay);
            float dayLift = mix(0.0, 0.14, uDay);
            vec3 rgb = tex.rgb * uDim * dim * dayBoost + vec3(dayLift);
            rgb = mix(rgb, pow(max(rgb, vec3(0.0)), vec3(0.82)), uDay * 0.65);
            rgb *= mix(vec3(0.5, 0.53, 0.68), vec3(1.04, 1.06, 1.1), uDay);
            rgb *= mix(0.38, 1.0, 1.0 - uNightVis);
            gl_FragColor = vec4(rgb, alpha);
          }
        `,
      }),
    [texture, pack.brightness, azRot, uniforms],
  )

  return (
    <mesh renderOrder={SKY_RENDER_ORDER.landscape} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
