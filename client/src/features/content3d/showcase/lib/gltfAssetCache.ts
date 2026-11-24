import * as THREE from 'three'
import type { GLTFLoader } from 'three-stdlib'
import { KTX2Loader } from 'three-stdlib'

/**
 * Hỗ trợ tải GLB cho số lượng lớn thực thể:
 *  - KTX2 (texture nén GPU) qua `extendGltfLoader`, cần gọi `initKtx2Support(gl)` một lần.
 *  - Đếm tham chiếu theo URL: khi không còn ai dùng một model trong `releaseDelayMs`,
 *    giải phóng geometry/material/texture khỏi GPU và báo cho cache của useGLTF xoá URL.
 */

let ktx2: KTX2Loader | null = null

/** Đường dẫn transcoder Basis (copy từ three/examples/jsm/libs/basis vào public/basis/). */
export const BASIS_TRANSCODER_PATH = '/basis/'

export function initKtx2Support(gl: THREE.WebGLRenderer) {
  if (ktx2 || typeof window === 'undefined') return
  ktx2 = new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(gl)
}

/** Truyền vào tham số `extendLoader` của useGLTF. Draco + Meshopt drei đã bật sẵn. */
export function extendGltfLoader(loader: GLTFLoader) {
  if (ktx2) loader.setKTX2Loader(ktx2)
}

type Entry = { refs: number; root: THREE.Object3D | null; timer: ReturnType<typeof setTimeout> | null }
const entries = new Map<string, Entry>()

export function disposeObjectTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []
    for (const m of mats) {
      for (const v of Object.values(m)) {
        if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose()
      }
      m.dispose()
    }
  })
}

export function acquireModel(url: string, root: THREE.Object3D) {
  const e = entries.get(url) ?? { refs: 0, root: null, timer: null }
  if (e.timer) clearTimeout(e.timer)
  e.timer = null
  e.refs += 1
  e.root = root
  entries.set(url, e)
}

/**
 * @param clearLoaderCache thường là `useGLTF.clear` — truyền vào để module này không phụ thuộc drei.
 */
export function releaseModel(url: string, clearLoaderCache: (url: string) => void, releaseDelayMs = 30_000) {
  const e = entries.get(url)
  if (!e) return
  e.refs = Math.max(0, e.refs - 1)
  if (e.refs > 0) return
  e.timer = setTimeout(() => {
    const cur = entries.get(url)
    if (!cur || cur.refs > 0) return
    if (cur.root) disposeObjectTree(cur.root)
    entries.delete(url)
    clearLoaderCache(url)
  }, releaseDelayMs)
}

/** Số model đang giữ trong bộ nhớ (để hiển thị trong overlay hiệu năng). */
export function residentModelCount() {
  return entries.size
}
