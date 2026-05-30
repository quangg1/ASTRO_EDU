'use client'

import { getBeatFieldValue } from '@/features/content3d/narrative/panel-schema/beatPath'
import { registryEntryForPath } from '@/features/content3d/narrative/panel-schema/fieldRegistry'
import type { NarrativePanelSchema } from '@/features/content3d/narrative/panel-schema/types'
import type { NarrativeBeat } from '@/features/content3d/narrative/types'
import { EARTH_SEA_LEVEL_PRESSURE_PA } from '@/features/content3d/narrative/types'

export function NarrativePanelPreview({
  beat,
  schema,
}: {
  beat: NarrativeBeat
  schema: NarrativePanelSchema
}) {
  const accent = beat.accentColor
  const subtitlePath = schema.previewHeroSubtitlePath
  const subtitle = subtitlePath ? String(getBeatFieldValue(beat, subtitlePath) ?? '') : beat.ageLabelVi

  const badgeSlots = schema.sections
    .flatMap((s) => s.fields)
    .filter((f) => !f.hidden && f.showInPreview === 'badge')

  const bodySlot = schema.sections.flatMap((s) => s.fields).find((f) => f.showInPreview === 'body')
  const compareSlot = schema.sections.flatMap((s) => s.fields).find((f) => f.showInPreview === 'compare')

  const bodyText = bodySlot
    ? String(getBeatFieldValue(beat, bodySlot.path) ?? '')
    : beat.panel.descriptionVi
  const compareText = compareSlot
    ? String(getBeatFieldValue(beat, compareSlot.path) ?? '')
    : beat.panel.compareNoteVi

  const pa = beat.environment.surfacePressureRepresentativePa
  const pctEarth = ((pa / EARTH_SEA_LEVEL_PRESSURE_PA) * 100).toFixed(2)
  const showGlobePressure = pa > 0

  return (
    <div className="rounded-xl border overflow-hidden text-xs" style={{ borderColor: `${accent}66` }}>
      <div
        className="px-3 py-2.5 border-b border-white/10"
        style={{ background: `linear-gradient(135deg, ${accent}33, transparent)` }}
      >
        <span className="text-2xl">{beat.icon}</span>
        <div className="mt-1">
          <p className="font-semibold text-white text-sm">{beat.name}</p>
          {subtitle ? <p className="text-[10px] text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      <div className="space-y-2 p-3 bg-black/30">
        <div className="flex flex-wrap gap-1.5">
          {badgeSlots.map((slot) => {
            const raw = getBeatFieldValue(beat, slot.path)
            const reg = registryEntryForPath(slot.path)
            let value = ''
            if (reg?.formatBadge) {
              value = reg.formatBadge(raw)
            } else if (slot.path === 'environment.surfaceTempMinC') {
              const max = beat.environment.surfaceTempMaxC
              value = `${raw}…${max} °C`
            } else if (raw != null && raw !== '') {
              value = String(raw)
            }
            if (!value && reg?.hideWhenEmpty) return null
            if (!value) return null
            return <Badge key={slot.id} label={slot.labelVi} value={value} accent={accent} />
          })}
        </div>
        {bodyText ? (
          <p className="text-[11px] leading-snug text-slate-300 line-clamp-3">{bodyText}</p>
        ) : null}
        {compareText ? (
          <p className="text-[10px] italic text-slate-500 line-clamp-2">{compareText}</p>
        ) : null}
        <div className="flex gap-2 pt-1 items-center">
          <div className="h-6 w-6 rounded border border-white/20 shrink-0" style={{ background: beat.visual.globeTint }} title="globeTint" />
          <div className="h-6 w-6 rounded border border-white/20 shrink-0" style={{ background: beat.visual.atmosphereColor }} title="atmosphere" />
          <span className="text-[10px] text-slate-500">
            H₂O {(beat.visual.waterCoverage * 100).toFixed(0)}% · bụi {(beat.visual.dustOpacity * 100).toFixed(0)}%
            {showGlobePressure ? ` · ~${pctEarth}% MNBC` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function Badge({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <span
      className="rounded-md border px-2 py-0.5 text-[10px]"
      style={{ borderColor: `${accent}55`, backgroundColor: `${accent}18` }}
    >
      <span className="text-slate-500">{label}: </span>
      <span className="text-slate-100">{value}</span>
    </span>
  )
}
