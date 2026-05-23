import { defaultPanelSchemaForEntity } from '@/features/content3d/narrative/panel-schema/defaultSchemas'
import { NARRATIVE_FIELD_REGISTRY } from '@/features/content3d/narrative/panel-schema/fieldRegistry'
import type {
  NarrativeFieldSlot,
  NarrativePanelSchema,
  NarrativePanelSection,
} from '@/features/content3d/narrative/panel-schema/types'

/** Gộp schema đã lưu với mặc định entity — giữ nhãn tuỳ chỉnh, bổ sung field mới từ registry. */
export function resolvePanelSchema(entityId: string, saved?: NarrativePanelSchema | null): NarrativePanelSchema {
  const base = defaultPanelSchemaForEntity(entityId)
  if (!saved?.sections?.length) return base

  const baseSectionById = new Map(base.sections.map((s) => [s.id, s]))
  const mergedSections: NarrativePanelSection[] = saved.sections.map((savedSec) => {
    const def = baseSectionById.get(savedSec.id)
    const fields = mergeFields(savedSec.fields, def?.fields ?? [])
    return {
      id: savedSec.id,
      titleVi: savedSec.titleVi || def?.titleVi || savedSec.id,
      titleEn: savedSec.titleEn ?? def?.titleEn,
      placement: savedSec.placement || def?.placement || 'custom',
      fields,
    }
  })

  for (const defSec of base.sections) {
    if (!mergedSections.some((s) => s.id === defSec.id)) {
      mergedSections.push(structuredClone(defSec))
    }
  }

  return {
    version: 1,
    timelineTitleVi: saved.timelineTitleVi ?? base.timelineTitleVi,
    addBeatLabelVi: saved.addBeatLabelVi ?? base.addBeatLabelVi,
    previewHeroSubtitlePath: saved.previewHeroSubtitlePath ?? base.previewHeroSubtitlePath,
    sections: mergedSections,
  }
}

function mergeFields(saved: NarrativeFieldSlot[], defaults: NarrativeFieldSlot[]): NarrativeFieldSlot[] {
  const defByPath = new Map(defaults.map((f) => [f.path, f]))
  const out: NarrativeFieldSlot[] = saved
    .filter((f) => NARRATIVE_FIELD_REGISTRY[f.path])
    .map((f) => {
      const d = defByPath.get(f.path)
      const reg = NARRATIVE_FIELD_REGISTRY[f.path]
      return {
        id: f.id || d?.id || f.path.replace(/\./g, '_'),
        path: f.path,
        labelVi: f.labelVi || d?.labelVi || reg.defaultLabelVi,
        labelEn: f.labelEn ?? d?.labelEn,
        kind: f.kind ?? d?.kind ?? reg.kind,
        hidden: f.hidden ?? false,
        colSpan: f.colSpan ?? d?.colSpan,
        rows: f.rows ?? d?.rows,
        showInPreview: f.showInPreview ?? d?.showInPreview,
      }
    })
  for (const d of defaults) {
    if (!out.some((f) => f.path === d.path)) out.push(structuredClone(d))
  }
  return out
}

export function visibleSchemaFields(schema: NarrativePanelSchema): NarrativeFieldSlot[] {
  return schema.sections.flatMap((s) => s.fields.filter((f) => !f.hidden))
}
