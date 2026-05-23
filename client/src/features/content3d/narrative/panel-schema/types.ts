/**
 * Thiết kế panel Deep History — mỗi entity tự định nghĩa section, nhãn, trường hiển thị.
 */

export type NarrativeFieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'icon'
  | 'select'
  | 'slider'
  | 'media-url'

/** Vị trí logic trong editor (nhóm form). */
export type NarrativeSectionPlacement =
  | 'identity'
  | 'panel-copy'
  | 'environment'
  | 'visual'
  | 'custom'

export type NarrativePreviewRole = 'none' | 'badge' | 'subtitle' | 'body' | 'compare'

export interface NarrativeFieldSlot {
  id: string
  /** Khóa registry, vd. `environment.eon` */
  path: string
  labelVi: string
  labelEn?: string
  kind?: NarrativeFieldKind
  hidden?: boolean
  colSpan?: 1 | 2
  rows?: number
  showInPreview?: NarrativePreviewRole
}

export interface NarrativePanelSection {
  id: string
  titleVi: string
  titleEn?: string
  placement: NarrativeSectionPlacement
  fields: NarrativeFieldSlot[]
}

export interface NarrativePanelSchema {
  version: 1
  timelineTitleVi?: string
  addBeatLabelVi?: string
  previewHeroSubtitlePath?: string
  sections: NarrativePanelSection[]
}
