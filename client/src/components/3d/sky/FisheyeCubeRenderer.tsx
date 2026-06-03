'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CubeCamera } from 'three'
import { fisheyeDisplayFragmentShader, fisheyeDisplayVertexShader } from './fisheyeShaders'
import { SKY_FOV_DEFAULT_DEG } from './skyVisuals'
import { viewRotationMatrix3, type SkyViewState } from './skyViewState'

export const SKY_RENDER_LAYER = 0

type Props = {
  children: React.ReactNode
  fovDeg?: number
  view: SkyViewState
}

const _rot = new THREE.Matrix3()

export function FisheyeCubeRenderer({ children, fovDeg = SKY_FOV_DEFAULT_DEG, view }: Props) {
  const { gl, scene, camera, size } = useThree()
  const cubeRt = useMemo(
    () =>
      new THREE.WebGLCubeRenderTarget(1024, {
        format: THREE.RGBAFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      }),
    [],
  )
  const cubeCam = useMemo(() => new CubeCamera(0.1, 3000, cubeRt), [cubeRt])
  const displayMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uCube: { value: cubeRt.texture },
          uFovDeg: { value: fovDeg },
          uWorldFromView: { value: new THREE.Matrix3() },
        },
        vertexShader: fisheyeDisplayVertexShader,
        fragmentShader: fisheyeDisplayFragmentShader,
        depthTest: false,
        depthWrite: false,
      }),
    [cubeRt.texture, fovDeg],
  )
  const displayScene = useMemo(() => new THREE.Scene(), [])
  const displayCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])
  const displayMesh = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMat)
    mesh.frustumCulled = false
    return mesh
  }, [displayMat])
  const ready = useRef(false)

  useEffect(() => {
    cubeCam.layers.set(SKY_RENDER_LAYER)
    camera.layers.disableAll()
    displayScene.add(displayMesh)
    ready.current = true
    return () => {
      displayScene.remove(displayMesh)
      cubeRt.dispose()
      displayMat.dispose()
      displayMesh.geometry.dispose()
    }
  }, [cubeCam, cubeRt, displayScene, displayMesh, displayMat, camera])

  useFrame(() => {
    if (!ready.current) return
    cubeCam.position.set(0, 0, 0)
    cubeCam.update(gl, scene)
    displayMat.uniforms.uWorldFromView.value.copy(viewRotationMatrix3(view, _rot))
  }, 1)

  useFrame(() => {
    if (!ready.current) return
    displayMat.uniforms.uCube.value = cubeRt.texture
    displayMat.uniforms.uFovDeg.value = fovDeg
    gl.setRenderTarget(null)
    gl.setViewport(0, 0, size.width, size.height)
    gl.clear(true, true, false)
    gl.render(displayScene, displayCam)
  }, 2)

  return <group layers={SKY_RENDER_LAYER}>{children}</group>
}
