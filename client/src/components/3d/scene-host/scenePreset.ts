/**
 * Cấu hình cấp Canvas của một cảnh 3D (camera, nền, tone mapping, raycast, click trượt).
 * Cùng một preset dựng được Canvas riêng (khóa học, Studio) hoặc áp lên Canvas
 * dùng chung của Explore khi đổi cảnh — để hai nơi không lệch cấu hình.
 */
export type ScenePreset = {
  /** Cảnh khác id thì nội dung được dựng lại; cùng id (Earth thường ↔ Earth Deep History) thì giữ. */
  id: string
  camera: {
    position: [number, number, number]
    fov: number
    near?: number
    far?: number
  }
  background: string
  toneMappingExposure: number
  dpr?: [number, number]
  /** Ngưỡng raycast cho Points / Line (mặc định của three là 1). */
  raycast?: { points?: number; line?: number }
  onPointerMissed?: () => void
}

export const DEFAULT_SCENE_DPR: [number, number] = [1, 2]
export const DEFAULT_CAMERA_FAR = 1000
