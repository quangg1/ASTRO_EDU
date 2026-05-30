'use client'

import { defaultPanelSchemaForEntity } from '@/features/content3d/narrative/panel-schema/defaultSchemas'
import { allRegistryPaths, registryEntryForPath } from '@/features/content3d/narrative/panel-schema/fieldRegistry'
import type {
  NarrativeFieldSlot,
  NarrativePanelSchema,
  NarrativePanelSection,
} from '@/features/content3d/narrative/panel-schema/types'

type Props = {
  entityId: string
  schema: NarrativePanelSchema
  onChange: (schema: NarrativePanelSchema) => void
}

export function NarrativePanelSchemaEditor({ entityId, schema, onChange }: Props) {
  const patchSection = (sectionId: string, patch: Partial<NarrativePanelSection>) => {
    onChange({
      ...schema,
      sections: schema.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    })
  }

  const patchField = (sectionId: string, fieldId: string, patch: Partial<NarrativeFieldSlot>) => {
    onChange({
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
            }
          : s,
      ),
    })
  }

  const addFieldToSection = (sectionId: string, path: string) => {
    const reg = registryEntryForPath(path)
    if (!reg) return
    const slot: NarrativeFieldSlot = {
      id: path.replace(/\./g, '_'),
      path,
      labelVi: reg.defaultLabelVi,
    }
    onChange({
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === sectionId && !s.fields.some((f) => f.path === path)
          ? { ...s, fields: [...s.fields, slot] }
          : s,
      ),
    })
  }

  const removeField = (sectionId: string, fieldId: string) => {
    onChange({
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === sectionId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s,
      ),
    })
  }

  const resetSchema = () => {
    onChange(defaultPanelSchemaForEntity(entityId))
  }

  const usedPaths = new Set(schema.sections.flatMap((s) => s.fields.map((f) => f.path)))
  const unusedPaths = allRegistryPaths().filter((p) => !usedPaths.has(p))

  return (
    <div className="space-y-4 rounded-lg border border-cyan-500/25 bg-cyan-950/15 p-4">
      <header className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300">
          Thiết kế panel · theo entity
        </p>
        <p className="text-xs text-ds-muted">
          Đổi tiêu đề section và nhãn từng trường — mỗi entity có schema riêng (preset hoặc tự đặt).
        </p>
        <div className="grid grid-cols-2 gap-2 max-w-lg">
          <label className="text-[11px] text-ds-muted">
            Tiêu đề timeline
            <input
              className="studio-field mt-0.5 w-full"
              value={schema.timelineTitleVi ?? ''}
              onChange={(e) => onChange({ ...schema, timelineTitleVi: e.target.value })}
            />
          </label>
          <label className="text-[11px] text-ds-muted">
            Nút thêm thời kỳ
            <input
              className="studio-field mt-0.5 w-full"
              value={schema.addBeatLabelVi ?? ''}
              onChange={(e) => onChange({ ...schema, addBeatLabelVi: e.target.value })}
            />
          </label>
        </div>
        <button type="button" onClick={resetSchema} className="text-xs text-amber-300 hover:underline">
          Khôi phục thiết kế mặc định cho {entityId}
        </button>
      </header>

      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
        {schema.sections.map((section) => (
          <div key={section.id} className="rounded-lg border border-ds-border bg-black/25 p-3 space-y-2">
            <label className="block text-[11px] text-ds-muted">
              Tiêu đề section
              <input
                className="studio-field mt-0.5 w-full font-medium"
                value={section.titleVi}
                onChange={(e) => patchSection(section.id, { titleVi: e.target.value })}
              />
            </label>
            <ul className="space-y-2">
              {section.fields.map((field) => (
                <li
                  key={field.id}
                  className="grid gap-2 rounded-md border border-white/5 bg-white/[0.03] p-2 sm:grid-cols-[1fr_auto]"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-ds-muted col-span-2">
                      Nhãn hiển thị
                      <input
                        className="studio-field mt-0.5 w-full"
                        value={field.labelVi}
                        onChange={(e) => patchField(section.id, field.id, { labelVi: e.target.value })}
                      />
                    </label>
                    <span className="text-[10px] text-slate-500 col-span-2 font-mono">{field.path}</span>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={field.showInPreview === 'badge'}
                        onChange={(e) =>
                          patchField(section.id, field.id, {
                            showInPreview: e.target.checked ? 'badge' : 'none',
                          })
                        }
                      />
                      Badge preview
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={Boolean(field.hidden)}
                        onChange={(e) => patchField(section.id, field.id, { hidden: e.target.checked })}
                      />
                      Ẩn trường
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(section.id, field.id)}
                    className="text-[10px] text-red-400/90 self-start sm:self-center"
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
            {unusedPaths.length > 0 ? (
              <label className="block text-[10px] text-ds-muted">
                Thêm trường từ thư viện
                <select
                  className="studio-field mt-0.5 w-full"
                  defaultValue=""
                  onChange={(e) => {
                    const p = e.target.value
                    if (p) addFieldToSection(section.id, p)
                    e.target.value = ''
                  }}
                >
                  <option value="">— chọn —</option>
                  {unusedPaths.map((p) => (
                    <option key={p} value={p}>
                      {registryEntryForPath(p)?.defaultLabelVi ?? p}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
