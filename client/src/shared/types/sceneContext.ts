/**
 * Bối cảnh cảnh 3D của một bài học — dùng chung cho bài Lộ trình và bài Khóa học
 * (đồng bộ `services/api/shared/schemas/sceneContextSchema.js`).
 */

/** Deep History focus — cùng entity với showcase, mở timeline + beat (và pin tuỳ chọn). */
export type LessonHistoryFocus = {
  beatId: number
  pinId?: string
  labelVi?: string
}

/** Bài học "claim" entity showcase 3D — Layer 3 deep-link (không dùng bridge rule). */
export type LessonSceneContext = {
  /** Entity catalog id (vd: planet-saturn) — ưu tiên hiển thị khi khớp. */
  primaryEntityId?: string
  /** Các entity bổ sung cùng bài có thể liên quan. */
  entityIds?: string[]
  /** Cùng primaryEntityId — mở Deep History (?history=1&beat=&pin=). */
  historyFocus?: LessonHistoryFocus
}
