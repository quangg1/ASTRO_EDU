'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ShowcaseMediaUrlField } from '@/app/studio/showcase-entities/ShowcaseMediaUrlField'
import { NarrativeBeatFieldsForm } from '@/app/studio/showcase-entities/narrative/NarrativeBeatFieldsForm'
import { NarrativePanelPreview } from '@/app/studio/showcase-entities/narrative/NarrativePanelPreview'
import { NarrativePanelSchemaEditor } from '@/app/studio/showcase-entities/narrative/NarrativePanelSchemaEditor'
import { NarrativeGlobeMapPicker } from '@/app/studio/showcase-entities/narrative/NarrativeGlobeMapPicker'
import { StageMultiSelect } from '@/app/studio/showcase-entities/narrative/StageMultiSelect'
import { getStudioGlobeDisplayName, getStudioGlobeTextureUrl } from '@/features/content3d/narrative/lib/studioGlobeTexture'
import type { ShowcaseEntityContentDTO } from '@/features/content3d/showcase/api/showcaseEntitiesApi'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'
import {
  entityExploreHref,
  entityHasExploreHistoryViewer,
  entityHasFossilsTab,
} from '@/app/studio/showcase-entities/entityHistoryCapability'
import { ensureBeatVisual } from '@/features/content3d/narrative/adapters'
import { applyPlanetNarrativeBundle } from '@/features/content3d/narrative/stores/planetNarrativeStore'
import type { NarrativeBeat, NarrativeSite, PlanetNarrativeBundle } from '@/features/content3d/narrative/types'
import { createEmptyBeat } from '@/features/content3d/narrative/lib/narrativeDefaults'
import { hasLegacyPreset, studioFallbackBundle } from '@/features/content3d/narrative/lib/legacyPresets'
import { resolvePanelSchema } from '@/features/content3d/narrative/panel-schema/mergeSchema'
import type { NarrativePanelSchema } from '@/features/content3d/narrative/panel-schema/types'
import { fetchEditorPlanetNarrative, savePlanetNarrative } from '@/features/content3d/planet-narrative/api/planetNarrativeApi'
import { notifyShowcaseCatalogChanged } from '@/lib/showcaseCatalogRefresh'

type SubTab = 'beat' | 'design' | 'sites' | 'fossils'

type Props = {
  entityId: string
  /** CMS showcase rows — cùng nguồn merge texture với globe 3D. */
  showcaseContent?: ShowcaseEntityContentDTO[]
}

function studioInitialState(entityId: string) {
  const fallback = studioFallbackBundle(entityId)
  return {
    bundle: fallback,
    selectedBeatId: fallback.beats[0]?.id ?? null,
    selectedSiteId: fallback.sites[0]?.id ?? '',
    dataSource: (fallback.beats.length ? 'legacy' : 'empty') as 'empty' | 'legacy' | 'db',
  }
}

export function NarrativeStudioEditor({ entityId, showcaseContent }: Props) {
  const showcaseCatalogGen = useShowcaseCatalogGen()
  const [subTab, setSubTab] = useState<SubTab>('beat')
  const [bundle, setBundle] = useState<PlanetNarrativeBundle>(
    () => studioInitialState(entityId).bundle,
  )
  const [selectedBeatId, setSelectedBeatId] = useState<number | null>(
    () => studioInitialState(entityId).selectedBeatId,
  )
  const [selectedSiteId, setSelectedSiteId] = useState(
    () => studioInitialState(entityId).selectedSiteId,
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dataSource, setDataSource] = useState<'empty' | 'legacy' | 'db'>(
    () => studioInitialState(entityId).dataSource,
  )

  const showFossilsTab = entityHasFossilsTab(entityId)
  const exploreHref = entityExploreHref(entityId)

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (token) {
      const { data } = await fetchEditorPlanetNarrative(token, entityId)
      if (data?.beats?.length) {
        const sorted = data.beats.map(ensureBeatVisual).sort((a, b) => a.order - b.order)
        setBundle({
          ...data,
          entityId,
          kind: 'generic',
          beats: sorted,
          panelSchema: resolvePanelSchema(entityId, data.panelSchema),
        })
        setSelectedBeatId(sorted[0]?.id ?? null)
        setSelectedSiteId(data.sites[0]?.id ?? '')
        setDataSource('db')
        setLoading(false)
        return
      }
    }
    const fallback = studioFallbackBundle(entityId)
    setBundle({
      ...fallback,
      panelSchema: resolvePanelSchema(entityId, fallback.panelSchema),
    })
    setSelectedBeatId(fallback.beats[0]?.id ?? null)
    setSelectedSiteId(fallback.sites[0]?.id ?? '')
    setDataSource(fallback.beats.length ? 'legacy' : 'empty')
    setLoading(false)
  }, [entityId])

  useEffect(() => {
    void load()
  }, [load])

  const panelSchema = useMemo(
    () => resolvePanelSchema(entityId, bundle.panelSchema),
    [entityId, bundle.panelSchema],
  )

  const stageOptions = useMemo(
    () =>
      bundle.beats.map((b) => ({
        value: b.id,
        label: `${b.icon} ${b.name}`.trim(),
      })),
    [bundle.beats],
  )

  const globeTextureUrl = useMemo(
    () => getStudioGlobeTextureUrl(entityId, showcaseContent),
    [entityId, showcaseContent, showcaseCatalogGen],
  )
  const globeBodyLabel = useMemo(() => getStudioGlobeDisplayName(entityId), [entityId])

  const beat = useMemo(
    () =>
      selectedBeatId != null
        ? bundle.beats.find((b) => b.id === selectedBeatId)
        : bundle.beats[0],
    [bundle.beats, selectedBeatId],
  )

  const site = useMemo(
    () => bundle.sites.find((s) => s.id === selectedSiteId) ?? bundle.sites[0],
    [bundle.sites, selectedSiteId],
  )

  const updateBeat = (next: NarrativeBeat) => {
    setBundle((b) => ({
      ...b,
      beats: b.beats.map((x) => (x.id === next.id ? next : x)),
    }))
  }

  const setPanelSchema = (schema: NarrativePanelSchema) => {
    setBundle((b) => ({ ...b, panelSchema: schema }))
  }

  const patchSite = (id: string, patch: Partial<NarrativeSite>) => {
    setBundle((b) => ({
      ...b,
      sites: b.sites.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  const addBeat = () => {
    const nextId = Math.max(0, ...bundle.beats.map((b) => b.id)) + 1
    const neu = createEmptyBeat(nextId, bundle.beats.length + 1)
    setBundle((b) => ({ ...b, beats: [...b.beats, neu] }))
    setSelectedBeatId(nextId)
    setSubTab('beat')
  }

  const importLegacy = () => {
    const fallback = studioFallbackBundle(entityId)
    if (!fallback.beats.length) return
    setBundle(fallback)
    setSelectedBeatId(fallback.beats[0]?.id ?? null)
    setSelectedSiteId(fallback.sites[0]?.id ?? '')
    setDataSource('legacy')
    setMessage('Đã khôi phục dữ liệu mẫu — bấm Lưu để ghi DB.')
  }

  const addSite = () => {
    const id = `site-${Date.now()}`
    const neu: NarrativeSite = {
      id,
      nameVi: 'Địa điểm mới',
      nameEn: 'New site',
      kind: 'plain',
      lat: 0,
      lng: 0,
      blurbVi: '',
      coverImageUrl: '',
      coverImageType: 'orbital_modern',
    }
    setBundle((b) => ({ ...b, sites: [...b.sites, neu] }))
    setSelectedSiteId(id)
    setSubTab('sites')
  }

  const onSave = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setMessage('Cần đăng nhập teacher/admin')
      return
    }
    if (!bundle.beats.length) {
      setMessage('Thêm ít nhất một thời kỳ trước khi lưu.')
      return
    }
    setSaving(true)
    const schema = resolvePanelSchema(entityId, bundle.panelSchema)
    const payload: PlanetNarrativeBundle = {
      ...bundle,
      entityId,
      kind: 'generic',
      panelSchema: schema,
      beats: bundle.beats.map((b, i) => ({ ...ensureBeatVisual(b), order: i + 1 })),
    }
    const r = await savePlanetNarrative(token, payload)
    if (!r.ok) {
      setSaving(false)
      setMessage(r.error || 'Lưu thất bại')
      return
    }
    applyPlanetNarrativeBundle(payload)
    setSaving(false)
    setDataSource('db')
    setMessage('Đã lưu — Explore Deep History đọc từ planet-narratives.')
    notifyShowcaseCatalogChanged()
  }

  if (loading) {
    return <p className="text-xs text-ds-muted py-4">Đang tải Deep History…</p>
  }

  return (
    <div className="space-y-4 rounded-xl border border-violet-500/25 bg-gradient-to-b from-violet-950/30 to-black/20 p-4">
      <header className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-violet-300">
            Deep History · CMS entity
          </p>
          <p className="text-xs text-ds-muted mt-1">
            {entityId} Â·{' '}
            {dataSource === 'db'
              ? 'cơ sở dữ liệu'
              : dataSource === 'legacy'
                ? 'dữ liệu mẫu legacy (chưa lưu DB — bấm Lưu để ghi)'
                : 'trống (chưa có thời kỳ)'}
            {!entityHasExploreHistoryViewer(entityId) ? (
              <span className="text-amber-200/90"> · Explore chưa có viewer 3D cho entity này</span>
            ) : null}
          </p>
        </div>
        <Link href={exploreHref} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-300 hover:underline">
          Explore →
        </Link>
      </header>

      <label className="block text-xs text-ds-muted">
        Bài Learning Path liên quan{' '}
        <span className="text-ds-subtle">(lesson id, cách nhau bằng dấu phẩy — hiện trên Explore Deep History)</span>
        <input
          value={(bundle.linkedLessonIds ?? []).join(', ')}
          onChange={(e) => {
            const linkedLessonIds = [
              ...new Set(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              ),
            ]
            setBundle((b) => ({ ...b, linkedLessonIds }))
          }}
          placeholder="vd: solar-system-planets-beginner-1"
          className="mt-1 w-full rounded-lg border border-ds-border bg-black/30 px-2 py-1.5 text-sm text-slate-100"
        />
      </label>

      <div className="flex gap-1 rounded-lg border border-ds-border p-1">
        {(
          [
            ['beat', 'Thời kỳ & panel'],
            ['design', 'Thiết kế panel'],
            ['sites', 'Pin / địa điểm'],
            ...(showFossilsTab ? ([['fossils', 'Hóa thạch']] as const) : []),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={
              subTab === id
                ? 'flex-1 rounded-md bg-violet-700/90 py-2 text-xs text-white'
                : 'flex-1 rounded-md py-2 text-xs text-ds-muted hover:bg-white/5'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'beat' && !beat ? (
        <div className="rounded-lg border border-dashed border-violet-500/40 bg-black/20 p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">Chưa có thời kỳ nào cho entity này.</p>
          <p className="text-xs text-ds-muted max-w-md mx-auto">
            Thêm thời kỳ mới — một số entity có preset mẫu khi chưa lưu DB.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={addBeat} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">
              + Tạo thời kỳ đầu tiên
            </button>
            {hasLegacyPreset(entityId) ? (
              <button type="button" onClick={importLegacy} className="rounded-lg border border-ds-border px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                Nhập dữ liệu mẫu (legacy)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {subTab === 'beat' && beat ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(11rem,14rem)_1fr_minmax(12rem,16rem)]">
          <aside className="space-y-2 rounded-lg border border-ds-border bg-black/25 p-2 max-h-[32rem] overflow-y-auto">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase text-slate-500">
                {panelSchema.timelineTitleVi ?? 'Timeline'}
              </span>
              <button type="button" onClick={addBeat} className="text-[10px] text-cyan-400 hover:underline">
                + {panelSchema.addBeatLabelVi ?? 'Thời kỳ'}
              </button>
            </div>
            {bundle.beats.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBeatId(b.id)}
                className={
                  b.id === selectedBeatId
                    ? 'w-full text-left rounded-lg border border-violet-500/50 bg-violet-950/40 px-2 py-2'
                    : 'w-full text-left rounded-lg border border-transparent px-2 py-2 hover:bg-white/5'
                }
              >
                <span className="text-lg">{b.icon}</span>
                <p className="text-xs font-medium text-white truncate">{b.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{b.ageLabelVi}</p>
              </button>
            ))}
          </aside>

          <NarrativeBeatFieldsForm beat={beat} schema={panelSchema} onChange={updateBeat} />

          <aside className="lg:sticky lg:top-2">
            <p className="text-[10px] uppercase text-slate-500 mb-2">Xem trước panel</p>
            <NarrativePanelPreview beat={beat} schema={panelSchema} />
          </aside>
        </div>
      ) : null}

      {subTab === 'sites' ? (
        bundle.sites.length === 0 && !site ? (
          <div className="rounded-lg border border-dashed border-ds-border p-6 text-center space-y-2">
            <p className="text-xs text-ds-muted">Chưa có pin — thêm địa điểm trên bề mặt entity.</p>
            <button type="button" onClick={addSite} className="text-sm text-cyan-400 hover:underline">
              + Pin mới
            </button>
          </div>
        ) : site ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(10rem,12rem)_1fr]">
            <div className="space-y-2">
              <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="studio-field w-full">
                {bundle.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameVi}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addSite} className="text-xs text-cyan-400">
                + Pin mới
              </button>
            </div>
            <div className="space-y-2">
              <Field label="Tên VI" value={site.nameVi} onChange={(v) => patchSite(site.id, { nameVi: v })} />
              <Field label="Tên EN" value={site.nameEn} onChange={(v) => patchSite(site.id, { nameEn: v })} />
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Loại địa hình</span>
                <select
                  value={site.kind}
                  onChange={(e) => patchSite(site.id, { kind: e.target.value })}
                  className="studio-field w-full"
                >
                  {['volcano', 'canyon', 'crater', 'plain', 'channel', 'polar', 'landing'].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Lat (-90…90)"
                  value={String(site.lat)}
                  onChange={(v) => patchSite(site.id, { lat: clampLat(Number(v)) })}
                />
                <Field
                  label="Lng (-180…180)"
                  value={String(site.lng)}
                  onChange={(v) => patchSite(site.id, { lng: clampLng(Number(v)) })}
                />
              </div>
              {globeTextureUrl ? (
                <NarrativeGlobeMapPicker
                  textureUrl={globeTextureUrl}
                  bodyLabel={globeBodyLabel}
                  value={{ lat: site.lat, lng: site.lng }}
                  onChange={({ lat, lng }) => patchSite(site.id, { lat, lng })}
                />
              ) : (
                <p className="text-[10px] text-amber-200/80 rounded-lg border border-amber-500/25 bg-amber-950/20 px-2 py-1.5">
                  Chưa có texture equirectangular trong catalog — thêm <code className="text-amber-100">texturePath</code> cho entity
                  hoặc nhập lat/lng tay.
                </p>
              )}
              <TextArea label="Blurb" value={site.blurbVi} onChange={(v) => patchSite(site.id, { blurbVi: v })} rows={2} />
              <StageMultiSelect
                label="Hiện trong các thời kỳ"
                options={stageOptions}
                value={site.validStageIds}
                onChange={(ids) =>
                  patchSite(site.id, {
                    validStageIds: ids,
                    visibleFromStageId: undefined,
                  })
                }
                placeholder="Để trống = hiện tất cả thời kỳ (hoặc quy tắc legacy)."
              />
              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Loại ảnh (badge Explore)</span>
                <select
                  value={site.coverImageType ?? 'orbital_modern'}
                  onChange={(e) =>
                    patchSite(site.id, {
                      coverImageType: e.target.value as NarrativeSite['coverImageType'],
                    })
                  }
                  className="studio-field w-full"
                >
                  <option value="orbital_modern">Orbital hiện đại</option>
                  <option value="surface_modern">Bề mặt hiện đại (rover)</option>
                  <option value="artistic">Minh họa / tái dựng</option>
                </select>
              </label>
              <ShowcaseMediaUrlField label="Ảnh" value={site.coverImageUrl} onChange={(url) => patchSite(site.id, { coverImageUrl: url })} accept="image/*" />
            </div>
          </div>
        ) : null
      ) : null}

      {subTab === 'design' ? (
        <NarrativePanelSchemaEditor entityId={entityId} schema={panelSchema} onChange={setPanelSchema} />
      ) : null}

      {subTab === 'fossils' ? (
        <p className="text-xs text-amber-100/90 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
          Hóa thạch Earth: hard-code + API /fossils — chưa trong NarrativeBeat. Timeline ở tab «Thời kỳ & panel».
        </p>
      ) : null}

      <footer className="flex flex-wrap gap-2 border-t border-ds-border pt-3">
        <button type="button" disabled={saving} onClick={() => void onSave()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50">
          {saving ? 'Đang lưu…' : 'Lưu Deep History'}
        </button>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-ds-border px-3 py-2 text-xs">
          Tải lại
        </button>
        {hasLegacyPreset(entityId) && bundle.beats.length > 0 ? (
          <button type="button" onClick={importLegacy} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs text-amber-200/90">
            Ghi đè bằng mẫu legacy
          </button>
        ) : null}
        {message ? <span className="text-xs text-ds-muted self-center">{message}</span> : null}
      </footer>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[11px] text-ds-muted">
      {label}
      <input className="studio-field mt-0.5 w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function clampLat(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.max(-90, Math.min(90, n)) * 100) / 100
}

function clampLng(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.max(-180, Math.min(180, n)) * 100) / 100
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <label className="block text-[11px] text-ds-muted">
      {label}
      <textarea className="studio-field mt-0.5 w-full" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

