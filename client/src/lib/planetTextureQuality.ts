import * as THREE from 'three'

/**
 * Hành tinh trong app là **mesh hình cầu + ảnh 2D** (JPG/PNG) bọc quanh — không phải model 3D sculpt.
 * Khi zoom gần, độ nét phụ thuộc độ phân giải file + nén + bộ lọc GPU.
 * Bật anisotropic filtering + mipmaps chuẩn giúp góc nhìn xiên (và cockpit) sắc hơn rõ rệt.
 */
export function applyGlobeTextureQuality(
  map: THREE.Texture,
  gl: THREE.WebGLRenderer,
  options?: {
    /** Mặc định clamp — Mặt Trời dùng repeat */
    wrap?: 'clamp' | 'repeat'
  }
): void {
  map.colorSpace = THREE.SRGBColorSpace
  if (options?.wrap === 'repeat') {
    map.wrapS = map.wrapT = THREE.RepeatWrapping
  } else {
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
  }
  map.generateMipmaps = true
  map.minFilter = THREE.LinearMipmapLinearFilter
  map.magFilter = THREE.LinearFilter
  const max =
    typeof gl.capabilities.getMaxAnisotropy === 'function'
      ? gl.capabilities.getMaxAnisotropy()
      : 1
  map.anisotropy = Math.min(16, max)
  map.needsUpdate = true
}
