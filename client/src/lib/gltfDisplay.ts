import * as THREE from 'three'

const COLOR_MAP_KEYS = ['map', 'emissiveMap', 'aoMap', 'specularMap', 'sheenColorMap'] as const
const LINEAR_MAP_KEYS = ['normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'displacementMap', 'alphaMap'] as const

function fixTextureColorSpace(tex: THREE.Texture, linear: boolean) {
  tex.colorSpace = linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
  tex.needsUpdate = true
}

function fixMaterial(mat: THREE.Material, geometry: THREE.BufferGeometry | undefined) {
  const m = mat as THREE.MeshStandardMaterial & {
    map?: THREE.Texture
    emissiveMap?: THREE.Texture
    aoMap?: THREE.Texture
    specularMap?: THREE.Texture
    sheenColorMap?: THREE.Texture
    normalMap?: THREE.Texture
    roughnessMap?: THREE.Texture
    metalnessMap?: THREE.Texture
    bumpMap?: THREE.Texture
    displacementMap?: THREE.Texture
    alphaMap?: THREE.Texture
  }

  if (geometry?.attributes?.color && 'vertexColors' in m && !m.vertexColors) {
    m.vertexColors = true
  }

  for (const key of COLOR_MAP_KEYS) {
    const tex = m[key]
    if (tex) fixTextureColorSpace(tex, false)
  }
  for (const key of LINEAR_MAP_KEYS) {
    const tex = m[key]
    if (tex) fixTextureColorSpace(tex, true)
  }

  m.needsUpdate = true
}

/** Clone GLTF scene and apply Three r152+ color management so textures match desktop viewers. */
export function prepareGltfSceneForDisplay(source: THREE.Object3D): THREE.Object3D {
  const root = source.clone(true)
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (mat) fixMaterial(mat, mesh.geometry)
    }
  })
  return root
}

export function configureGltfRenderer(gl: THREE.WebGLRenderer) {
  gl.outputColorSpace = THREE.SRGBColorSpace
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 1.08
}
