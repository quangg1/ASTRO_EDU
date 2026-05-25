'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ShowcaseMediaUrlField } from '@/app/studio/showcase-entities/ShowcaseMediaUrlField'
import type { UploadMediaContext } from '@/features/courses/public'
import { getBeatFieldValue, setBeatFieldValue } from '@/features/content3d/narrative/panel-schema/beatPath'
import {
  registryEntryForPath,
  type RegistrySelectOption,
} from '@/features/content3d/narrative/panel-schema/fieldRegistry'
import type { NarrativePanelSchema, NarrativePanelSection } from '@/features/content3d/narrative/panel-schema/types'
import type { NarrativeBeat } from '@/features/content3d/narrative/types'

type BeatFormTab = 'identity' | 'science' | 'content'

const TAB_SECTION_IDS: Record<BeatFormTab, string[]> = {
  identity: ['identity'],
  science: ['atmosphere', 'globe'],
  content: ['panel-copy'],
}

type Props = {
  entityId: string
  beat: NarrativeBeat
  schema: NarrativePanelSchema
  onChange: (beat: NarrativeBeat) => void
}

function beatMediaContext(entityId: string, beatId: string, fieldPath: string): UploadMediaContext {
  const field = String(fieldPath).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\./g, '-')
  return {
    purpose: 'showcase-entity',
    entityId,
    variant: `narrative/beats/${beatId}/${field}`,
  }
}

export function NarrativeBeatFieldsForm({ entityId, beat, schema, onChange }: Props) {
  const [formTab, setFormTab] = useState<BeatFormTab>('identity')

  const patchPath = (path: string, value: unknown) => {
    onChange(setBeatFieldValue(beat, path, value))
  }

  const sectionsByTab = useMemo(() => {
    const map = new Map<string, NarrativePanelSection>()
    for (const s of schema.sections) map.set(s.id, s)
    const pick = (tab: BeatFormTab) =>
      TAB_SECTION_IDS[tab]
        .map((id) => map.get(id))
        .filter((s): s is NarrativePanelSection => !!s)
    return {
      identity: pick('identity'),
      science: pick('science'),
      content: pick('content'),
    }
  }, [schema.sections])

  const tabs: { id: BeatFormTab; label: string }[] = [
    { id: 'identity', label: 'Danh tính' },
    { id: 'science', label: 'Khoa học & globe' },
    { id: 'content', label: 'Nội dung' },
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <div className="flex gap-1 rounded-lg border border-ds-border bg-black/25 p-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFormTab(id)}
            className={
              formTab === id
                ? 'flex-1 rounded-md bg-violet-800/80 py-1.5 text-[11px] font-medium text-white'
                : 'flex-1 rounded-md py-1.5 text-[11px] text-slate-400 hover:bg-white/5'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto max-h-[28rem] pr-0.5 [scrollbar-gutter:stable]">
        {sectionsByTab[formTab].map((section) => (
          <SectionFields
            key={section.id}
            section={section}
            beat={beat}
            patchPath={patchPath}
          />
        ))}
      </div>
    </div>
  )
}

function SectionFields({
  section,
  beat,
  patchPath,
}: {
  section: NarrativePanelSection
  beat: NarrativeBeat
  patchPath: (path: string, value: unknown) => void
}) {
  const fields = section.fields.filter((f) => !f.hidden)
  if (!fields.length) return null

  return (
    <Section title={section.titleVi}>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((slot) => {
          const reg = registryEntryForPath(slot.path)
          if (!reg) return null
          const kind = slot.kind ?? reg.kind
          const label = slot.labelVi
          const colSpan = slot.colSpan === 2 ? 'col-span-2' : ''
          const value = getBeatFieldValue(beat, slot.path)

          if (kind === 'textarea') {
            return (
              <label key={slot.id} className={`block text-[11px] text-ds-muted ${colSpan}`}>
                {label}
                <textarea
                  className="studio-field mt-0.5 w-full"
                  rows={slot.rows ?? 3}
                  value={String(value ?? '')}
                  onChange={(e) => patchPath(slot.path, e.target.value)}
                />
              </label>
            )
          }
          if (kind === 'select') {
            const opts = (reg.options ?? []) as readonly (RegistrySelectOption | string)[]
            return (
              <label key={slot.id} className={`block text-[11px] text-ds-muted ${colSpan}`}>
                {label}
                <select
                  className="studio-field mt-0.5 w-full"
                  value={String(value ?? '')}
                  onChange={(e) => patchPath(slot.path, e.target.value)}
                >
                  {opts.map((o) => {
                    const v = typeof o === 'string' ? o : o.value
                    const l = typeof o === 'string' ? o : o.labelVi
                    return (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    )
                  })}
                </select>
              </label>
            )
          }
          if (kind === 'slider') {
            const num = Number(value) || 0
            return (
              <label key={slot.id} className={`block text-[11px] text-ds-muted ${colSpan}`}>
                {label} <span className="text-slate-500">({num.toFixed(2)})</span>
                <input
                  type="range"
                  min={reg.sliderMin ?? 0}
                  max={reg.sliderMax ?? 1}
                  step={reg.sliderStep ?? 0.01}
                  value={num}
                  onChange={(e) => patchPath(slot.path, Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            )
          }
          if (kind === 'color') {
            const s = String(value ?? '#888888')
            return (
              <label key={slot.id} className={`block text-[11px] text-ds-muted ${colSpan}`}>
                {label}
                <div className="mt-0.5 flex gap-2">
                  <input
                    type="color"
                    value={s.startsWith('#') ? s : '#888888'}
                    onChange={(e) => patchPath(slot.path, e.target.value)}
                    className="h-9 w-12 rounded border border-ds-border"
                  />
                  <input
                    className="studio-field flex-1 font-mono text-[11px]"
                    value={s}
                    onChange={(e) => patchPath(slot.path, e.target.value)}
                  />
                </div>
              </label>
            )
          }
          if (kind === 'media-url') {
            return (
              <div key={slot.id} className={colSpan}>
                <ShowcaseMediaUrlField
                  label={label}
                  value={String(value ?? '')}
                  onChange={(url) => patchPath(slot.path, url)}
                  accept="image/*"
                  uploadContext={beatMediaContext(entityId, beat.id, slot.path)}
                />
              </div>
            )
          }
          if (kind === 'number') {
            return (
              <label key={slot.id} className={`block text-[11px] text-ds-muted ${colSpan}`}>
                {label}
                <input
                  className="studio-field mt-0.5 w-full"
                  value={value == null || value === '' ? '' : String(value)}
                  onChange={(e) => {
                    const t = e.target.value
                    patchPath(slot.path, t === '' ? undefined : Number(t))
                  }}
                />
              </label>
            )
          }
          return (
            <label key={slot.id} className={`block text-[11px] text-ds-muted ${colSpan}`}>
              {label}
              <input
                className="studio-field mt-0.5 w-full"
                value={String(value ?? '')}
                onChange={(e) => patchPath(slot.path, e.target.value)}
              />
            </label>
          )
        })}
      </div>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-ds-border/80 bg-black/20 p-3 space-y-2 mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  )
}
