'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getNasaCatalogItemById, NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { planetsData } from '@/lib/solarSystemData'
import {
  createShowcaseEntity,
  deleteShowcaseEntity,
  fetchEditorShowcaseEntityContents,
  saveShowcaseEntityContents,
  type ShowcaseEditorCatalogItem,
  type ShowcasePanelBlockDTO,
  type ShowcaseEntityContentDTO,
} from '@/features/content3d/showcase/public'
import { ShowcaseEntityPicker } from '@/app/studio/showcase-entities/ShowcaseEntityPicker'
import {
  sortShowcaseEntityRowsHierarchical,
  type ShowcaseEntityGroup,
} from '@/app/studio/showcase-entities/showcaseEntityHierarchy'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'
import { ShowcaseMediaUrlField } from '@/app/studio/showcase-entities/ShowcaseMediaUrlField'
import type { UploadMediaContext } from '@/features/courses/public'
import { ShowcaseEntityPreviewCard } from '@/app/studio/showcase-entities/ShowcaseEntityPreviewCard'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { showcaseMediaUrlsEquivalent } from '@/lib/showcaseMediaUrl'
import { notifyShowcaseCatalogChanged } from '@/lib/showcaseCatalogRefresh'
import { syncShowcaseOrbitEntityFromJpl } from '@/features/content3d/showcase/public'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { useLearningPath } from '@/features/learning-path/public'
import { NarrativeStudioEditor } from '@/app/studio/showcase-entities/narrative/NarrativeStudioEditor'
import { entitySupportsHistory } from '@/app/studio/showcase-entities/entityHistoryCapability'

function showcaseUploadContext(entityId: string, variant: string): UploadMediaContext {
  return { purpose: 'showcase-entity', entityId, variant }
}

const ORBIT_COLOR_PRESETS = [
  '#f43f5e', '#fb7185', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#64748b',
]

function normalizeHexColor(input: string, fallback = '#64748b'): string {
  const s = String(input || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : fallback
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const x = normalizeHexColor(hex).slice(1)
  const r = parseInt(x.slice(0, 2), 16) / 255
  const g = parseInt(x.slice(2, 4), 16) / 255
  const b = parseInt(x.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  let s = 0
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360
  const ss = Math.max(0, Math.min(100, s)) / 100
  const ll = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ll - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hh < 60) [r, g, b] = [c, x, 0]
  else if (hh < 120) [r, g, b] = [x, c, 0]
  else if (hh < 180) [r, g, b] = [0, c, x]
  else if (hh < 240) [r, g, b] = [0, x, c]
  else if (hh < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function buildInitialRows(
  db: ShowcaseEntityContentDTO[] | null,
  catalog: ShowcaseEditorCatalogItem[],
): ShowcaseEntityContentDTO[] {
  const m = new Map((db || []).map((r) => [String(r.entityId || '').trim(), r]))
  const baseCatalog =
    catalog.length > 0
      ? catalog
      : NASA_SHOWCASE_ITEMS.map((b) => ({
          id: b.id,
          name: b.name,
          group: b.group,
          linkedPlanetName: b.linkedPlanetName,
        }))

  const rows = baseCatalog.map((b) => {
    const ex = m.get(b.id)
    const legacyTex = ex?.textureUrl?.trim() || ''
    const diffuse = ex?.diffuseMapUrl?.trim() || legacyTex
    return {
      entityId: b.id,
      nameVi: ex?.nameVi?.trim() || '',
      museumBlurbVi: ex?.museumBlurbVi?.trim() || '',
      textureUrl: diffuse,
      diffuseMapUrl: diffuse,
      normalMapUrl: ex?.normalMapUrl?.trim() || '',
      specularMapUrl: ex?.specularMapUrl?.trim() || '',
      cloudMapUrl: ex?.cloudMapUrl?.trim() || '',
      modelUrl: ex?.modelUrl?.trim() || '',
      horizonsId: ex?.horizonsId?.trim() || '',
      orbitAround: ex?.orbitAround?.trim() || '',
      parentId: ex?.parentId?.trim() || '',
      radiusKm: Number(ex?.radiusKm || 0) || 0,
      orbitColor: ex?.orbitColor?.trim() || '',
      orbitalElements: ex?.orbitalElements || {
        a: 0,
        e: 0,
        i: 0,
        om: 0,
        w: 0,
        m: 0,
        periodDays: 0,
      },
      horizonsCommand: ex?.horizonsCommand?.trim() || '',
      horizonsCenter: ex?.horizonsCenter?.trim() || '',
      parentPlanetName: ex?.parentPlanetName?.trim() || '',
      published: ex ? ex.published !== false : true,
      panelConfig: ex?.panelConfig || null,
    }
  })

  const catalogForSort =
    catalog.length > 0
      ? catalog.map((c) => ({
          id: c.id,
          name: c.name,
          group: c.group,
          linkedPlanetName: c.linkedPlanetName,
        }))
      : [...NASA_SHOWCASE_ITEMS]

  return sortShowcaseEntityRowsHierarchical(rows, catalogForSort)
}

function ensurePanelConfig(row: ShowcaseEntityContentDTO): NonNullable<ShowcaseEntityContentDTO['panelConfig']> {
  return row.panelConfig || {
    stateBadge: '',
    tabs: ['overview', 'physical', 'sky'],
    tabLabels: { overview: 'Overview', physical: 'Physical', sky: 'Sky' },
    overviewBlocks: [],
    physicalBlocks: [],
    skyBlocks: [],
    conceptTagIds: [],
    lessonIds: [],
  }
}

function newPanelBlock(type: 'text' | 'image' | 'chart'): ShowcasePanelBlockDTO {
  return {
    id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    title: '',
    body: '',
    imageUrl: '',
    chartKind: type === 'chart' ? 'bar' : '',
    points: type === 'chart' ? [{ label: 'Metric', value: 1 }] : [],
    style: {
      variant: 'glass',
      align: 'left',
      bgColor: '',
      borderColor: '',
      textColor: '',
      accentColor: '',
    },
  }
}

function StudioShowcaseEntitiesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showcaseCatalogGen = useShowcaseCatalogGen()
  const { user, checked } = useAuthStore()
  const [rows, setRows] = useState<ShowcaseEntityContentDTO[]>([])
  const [editorCatalog, setEditorCatalog] = useState<ShowcaseEditorCatalogItem[]>([])
  const [selectedId, setSelectedId] = useState<string>(NASA_SHOWCASE_ITEMS[0]?.id ?? '')
  const [entityCrudBusy, setEntityCrudBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingJpl, setSyncingJpl] = useState(false)
  const [message, setMessage] = useState('')
  const [studioTab, setStudioTab] = useState<'media' | 'panel' | 'history'>('media')
  const lastLoadedKeyRef = useRef('')
  const { modules, concepts } = useLearningPath()

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/showcase-entities')
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user, router])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    const editor = await fetchEditorShowcaseEntityContents()
    if (editor) {
      setEditorCatalog(editor.catalog)
      setRows(buildInitialRows(editor.items, editor.catalog))
    } else {
      setEditorCatalog([])
      setRows(buildInitialRows(null, []))
    }
    setLoading(false)
  }, [])

  /** Chỉ fetch CMS rows lúc đăng nhập — không reload khi catalog public refetch (tab focus). */
  useEffect(() => {
    const uid = String(user?.id || '')
    if (!uid) return
    if (lastLoadedKeyRef.current === uid) return
    lastLoadedKeyRef.current = uid
    void load()
  }, [user?.id, load])

  useEffect(() => {
    if (selectedId) return
    const first = rows[0]?.entityId || NASA_SHOWCASE_ITEMS[0]?.id || ''
    if (first) setSelectedId(first)
  }, [rows, selectedId])

  useEffect(() => {
    const entity = searchParams.get('entity')?.trim()
    const tab = searchParams.get('tab')?.trim()
    if (entity) {
      const inCatalog =
        editorCatalog.some((it) => it.id === entity) ||
        NASA_SHOWCASE_ITEMS.some((it) => it.id === entity) ||
        rows.some((r) => r.entityId === entity)
      if (inCatalog) setSelectedId(entity)
    }
    if (tab === 'media' || tab === 'panel' || tab === 'history') {
      setStudioTab(tab)
    }
  }, [searchParams, editorCatalog, rows])

  useEffect(() => {
    if (studioTab === 'history' && !entitySupportsHistory(selectedId)) {
      setStudioTab('media')
    }
  }, [selectedId, studioTab])

  const showHistoryTab = entitySupportsHistory(selectedId)

  const setStudioTabWithUrl = (tab: 'media' | 'panel' | 'history') => {
    setStudioTab(tab)
    const params = new URLSearchParams()
    params.set('entity', selectedId)
    if (tab !== 'media') params.set('tab', tab)
    router.replace(`/studio/showcase-entities?${params.toString()}`, { scroll: false })
  }

  const setSelectedIdWithUrl = (entityId: string) => {
    setSelectedId(entityId)
    const tab = studioTab
    const params = new URLSearchParams()
    params.set('entity', entityId)
    if (tab !== 'media') params.set('tab', tab)
    if (tab === 'history' && !entitySupportsHistory(entityId)) {
      setStudioTab('media')
      params.delete('tab')
    }
    router.replace(`/studio/showcase-entities?${params.toString()}`, { scroll: false })
  }

  const selected = useMemo(() => rows.find((r) => r.entityId === selectedId), [rows, selectedId])
  const orbitColorHex = useMemo(() => normalizeHexColor(selected?.orbitColor || ''), [selected?.orbitColor])
  const orbitHsl = useMemo(() => hexToHsl(orbitColorHex), [orbitColorHex])
  /** Hiển thị dropdown khi DB chưa có parentPlanetName nhưng đã có parentId planet-*. */
  const parentPlanetSelectValue = useMemo(() => {
    const d = selected?.parentPlanetName?.trim()
    if (d) return d
    const pid = selected?.parentId?.trim()
    if (!pid?.startsWith('planet-')) return ''
    const c = getNasaCatalogItemById(pid)
    return String(c?.linkedPlanetName || c?.name || '').trim()
  }, [selected?.parentPlanetName, selected?.parentId])
  const selectedBase = useMemo(
    () => NASA_SHOWCASE_ITEMS.find((x) => x.id === selectedId) || null,
    [selectedId, showcaseCatalogGen],
  )
  const effectiveTextureUrl = useMemo(() => {
    const d = selected?.diffuseMapUrl?.trim() || ''
    if (d) return resolveMediaUrl(d)
    if (selectedBase?.texturePath) return resolveMediaUrl(selectedBase.texturePath)
    return ''
  }, [selected?.diffuseMapUrl, selectedBase?.texturePath])
  const cloudDuplicatesDiffuse = useMemo(() => {
    if (!selected) return false
    const diffuse = selected.diffuseMapUrl?.trim() || selected.textureUrl?.trim() || ''
    const cloud = selected.cloudMapUrl?.trim() || ''
    return Boolean(cloud && diffuse && showcaseMediaUrlsEquivalent(cloud, diffuse))
  }, [selected])
  const previewEntity = useMemo<ShowcaseOrbitEntity | null>(() => {
    if (!selected || !selectedBase) return null
    const fallbackColor =
      selected.entityId.startsWith('planet-')
        ? '#b48a5a'
        : selected.entityId.startsWith('moon-')
          ? '#9ca3af'
          : selected.entityId.startsWith('sc-')
            ? '#d7dbe7'
            : '#7c8aa0'
    return {
      id: selected.entityId,
      name: selected.nameVi?.trim() || selectedBase.name,
      parentId: selected.parentId?.trim() || undefined,
      parentPlanetName: selected.parentPlanetName?.trim() || undefined,
      distance: 1,
      period: 20,
      size: 0.42,
      color: fallbackColor,
      orbitColor: normalizeHexColor(selected.orbitColor || '#64748b'),
      texturePath: selectedBase.texturePath,
      remoteTextureUrl: selected.diffuseMapUrl?.trim() || undefined,
      remoteNormalMapUrl: selected.normalMapUrl?.trim() || undefined,
      remoteSpecularMapUrl: selected.specularMapUrl?.trim() || undefined,
      remoteCloudMapUrl: selected.cloudMapUrl?.trim() || undefined,
      remoteModelUrl: selected.modelUrl?.trim() || undefined,
      modelScale: 1,
      modelRotationDeg: [0, 0, 0],
      radiusKm: Number(selected.radiusKm || 0) || undefined,
      orbitalElements: selected.orbitalElements || undefined,
      semiMajorAxisAu: Number(selected.orbitalElements?.a || 0) || undefined,
      periodDays: Number(selected.orbitalElements?.periodDays || 0) || undefined,
      orbitSource: 'jpl-horizons',
    }
  }, [selected, selectedBase])
  const lessonOptions = useMemo(() => {
    const out: Array<{ id: string; title: string }> = []
    for (const mod of modules) {
      for (const node of mod.nodes) {
        for (const depth of ['beginner', 'explorer', 'researcher'] as const) {
          for (const lesson of node.depths[depth] || []) {
            out.push({
              id: lesson.id,
              title: lesson.titleVi || lesson.title || lesson.id,
            })
          }
        }
      }
    }
    return out
  }, [modules])

  const patchSelected = (patch: Partial<ShowcaseEntityContentDTO>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.entityId !== selectedId) return r
        const next = { ...r, ...patch }
        if (patch.diffuseMapUrl !== undefined) next.textureUrl = patch.diffuseMapUrl
        return next
      }),
    )
  }

  const patchPanelConfig = (
    updater: (
      cfg: NonNullable<ShowcaseEntityContentDTO['panelConfig']>,
    ) => NonNullable<ShowcaseEntityContentDTO['panelConfig']>,
  ) => {
    if (!selected) return
    const cfg = ensurePanelConfig(selected)
    patchSelected({ panelConfig: updater(cfg) })
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    const payload = rows.map((r) => ({
      ...r,
      textureUrl: r.diffuseMapUrl?.trim() || r.textureUrl?.trim() || '',
      horizonsCommand: r.horizonsId?.trim() || r.horizonsCommand?.trim() || '',
      horizonsCenter: r.orbitAround?.trim() || r.horizonsCenter?.trim() || '',
    }))
    const r = await saveShowcaseEntityContents(payload)
    setSaving(false)
    if (r.ok && r.items) {
      setRows(buildInitialRows(r.items, editorCatalog))
      setMessage('Đã lưu.')
      notifyShowcaseCatalogChanged()
    } else {
      setMessage(r.error || 'Lỗi lưu')
    }
  }

  const syncSelectedFromJpl = async () => {
    if (!selected) return
    setSyncingJpl(true)
    setMessage('')
    const r = await syncShowcaseOrbitEntityFromJpl(selected.entityId, {
      horizonsId: selected.horizonsId,
      orbitAround: selected.orbitAround,
      parentId: selected.parentId,
      parentPlanetName: selected.parentPlanetName,
      horizonsCommand: selected.horizonsCommand,
      horizonsCenter: selected.horizonsCenter,
    })
    setSyncingJpl(false)
    if (!r.ok || !r.item) {
      setMessage(r.error || 'Sync JPL thất bại')
      return
    }
    const item = r.item
    const pid = String(item.parentId || selected.parentId || '').trim()
    const inferredParent =
      pid && pid.startsWith('planet-')
        ? String(getNasaCatalogItemById(pid)?.linkedPlanetName || getNasaCatalogItemById(pid)?.name || '').trim()
        : ''
    patchSelected({
      horizonsId: item.horizonsId || selected.horizonsId,
      orbitAround: item.orbitAround || selected.orbitAround,
      parentId: item.parentId || selected.parentId,
      parentPlanetName: inferredParent || selected.parentPlanetName,
      radiusKm: item.radiusKm || selected.radiusKm,
      orbitalElements: item.orbitalElements || selected.orbitalElements,
      horizonsCommand: item.horizonsId || selected.horizonsCommand,
      horizonsCenter: item.orbitAround || selected.horizonsCenter,
    })
    setMessage(
      r.whenUsed
        ? `Đã sync JPL (ephemeris ngày ${r.whenUsed}). Bấm Lưu để ghi DB.`
        : 'Đã sync dữ liệu JPL cho entity hiện tại. Bấm Lưu để ghi DB.',
    )
  }

  const refreshAfterEntityCrud = async (nextSelectedId?: string) => {
    const editor = await fetchEditorShowcaseEntityContents()
    if (editor) {
      setEditorCatalog(editor.catalog)
      setRows(buildInitialRows(editor.items, editor.catalog))
      const pick =
        nextSelectedId && editor.items.some((r) => r.entityId === nextSelectedId)
          ? nextSelectedId
          : editor.items[0]?.entityId
      if (pick) setSelectedIdWithUrl(pick)
    }
    notifyShowcaseCatalogChanged()
  }

  const handleCreateEntity = async (input: {
    entityId: string
    name: string
    group: ShowcaseEntityGroup
    parentId: string
    linkedPlanetName: string
  }) => {
    setEntityCrudBusy(true)
    setMessage('')
    const r = await createShowcaseEntity(input)
    setEntityCrudBusy(false)
    if (!r.ok) return { ok: false, error: r.error }
    setMessage(`Đã tạo ${r.entityId || input.entityId}.`)
    await refreshAfterEntityCrud(r.entityId || input.entityId)
    return { ok: true }
  }

  const handleDeleteEntity = async (entityId: string, cascade: boolean) => {
    setEntityCrudBusy(true)
    setMessage('')
    const r = await deleteShowcaseEntity(entityId, { cascade })
    setEntityCrudBusy(false)
    if (!r.ok) return { ok: false, error: r.error }
    setMessage(`Đã xóa ${entityId}.`)
    await refreshAfterEntityCrud()
    return { ok: true }
  }

  if (!checked || !user) {
    return <div className="min-h-screen bg-ds-base text-ds-text pt-20 px-4 text-ds-muted">Đang kiểm tra đăng nhập...</div>
  }

  return (
    <div className="min-h-screen bg-ds-base pt-14 pb-10 px-3 md:px-6">
      <div className={`mx-auto space-y-4 ${studioTab === 'history' ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <nav className="text-sm">
          <Link href="/studio" className="text-ds-accent hover:text-ds-accent">
            ← Studio
          </Link>
        </nav>
        <div className="rounded-2xl border border-ds-border bg-ds-surface p-5">
          <h1 className="text-xl font-semibold text-white">3D Studio</h1>
          <p className="text-xs text-ds-muted mt-1">
            Một studio cho mọi entity Showcase: texture &amp; orbit, panel museum, và tab{' '}
            <strong className="text-ds-text">Deep History</strong> (timeline, pin, shader — mọi entity). Chỉ tab{' '}
            <strong className="text-ds-text">Hóa thạch</strong> là riêng Trái Đất.
          </p>
        </div>

        {loading ? (
          <p className="text-ds-subtle text-sm">Đang tải…</p>
        ) : (
          <div className="rounded-2xl border border-ds-border bg-ds-surface p-5 space-y-4">
            <ShowcaseEntityPicker
              selectedId={selectedId}
              rows={rows}
              catalog={editorCatalog}
              busy={entityCrudBusy || saving}
              onSelect={setSelectedIdWithUrl}
              onCreate={handleCreateEntity}
              onDelete={handleDeleteEntity}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudioTabWithUrl('media')}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  studioTab === 'media'
                    ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-100'
                    : 'border-ds-border-strong text-slate-300 hover:bg-white/10'
                }`}
              >
                Media & Orbit
              </button>
              <button
                type="button"
                onClick={() => setStudioTabWithUrl('panel')}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  studioTab === 'panel'
                    ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-100'
                    : 'border-ds-border-strong text-slate-300 hover:bg-white/10'
                }`}
              >
                Panel content
              </button>
              {showHistoryTab ? (
                <button
                  type="button"
                  onClick={() => setStudioTabWithUrl('history')}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    studioTab === 'history'
                      ? 'border-violet-500/60 bg-violet-950/50 text-violet-100'
                      : 'border-ds-border-strong text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Deep History
                </button>
              ) : null}
            </div>

            {selected ? (
              studioTab === 'history' ? (
                <NarrativeStudioEditor entityId={selectedId} showcaseContent={rows} />
              ) : studioTab === 'media' ? (
              <>
                <label className="block text-xs text-ds-muted">
                  Tên hiển thị (Tiếng Việt, tuỳ chọn)
                  <input
                    value={selected.nameVi}
                    onChange={(e) => patchSelected({ nameVi: e.target.value })}
                    placeholder="Để trống = dùng tên EN mặc định trong catalog"
                    className="studio-field mt-1"
                  />
                </label>
                <label className="block text-xs text-ds-muted">
                  Nhãn museum / mô tả ngắn (VI)
                  <textarea
                    value={selected.museumBlurbVi}
                    onChange={(e) => patchSelected({ museumBlurbVi: e.target.value })}
                    rows={5}
                    placeholder="Hiển thị trên Explore (Layer 1). Để trống = dùng copy mặc định trong code."
                    className="studio-field mt-1"
                  />
                </label>

                <div className="border-t border-ds-border pt-4 space-y-4">
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Maps (sphere)</p>
                  <div className="rounded-md border border-ds-border bg-black/25 p-2">
                    <p className="text-[11px] text-ds-subtle">Effective texture URL</p>
                    <p className="text-[11px] text-ds-accent font-mono break-all">
                      {effectiveTextureUrl || '(chưa có)'}
                    </p>
                  </div>
                  <ShowcaseMediaUrlField
                    label="Diffuse / albedo"
                    description="Equirectangular 2:1 (vd. 2048×1024) bọc full sphere. Moon NASA hiện tại ~1:1 — vẫn dùng được nhưng dễ lệch cực; nên upload bản 2:1 nếu có."
                    value={selected.diffuseMapUrl}
                    onChange={(url) => patchSelected({ diffuseMapUrl: url, textureUrl: url })}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    uploadContext={showcaseUploadContext(selected.entityId, 'diffuse')}
                  />
                  <ShowcaseMediaUrlField
                    label="Normal map (tuỳ chọn)"
                    value={selected.normalMapUrl}
                    onChange={(url) => patchSelected({ normalMapUrl: url })}
                    accept="image/jpeg,image/png,image/webp"
                    uploadContext={showcaseUploadContext(selected.entityId, 'normal')}
                  />
                  <ShowcaseMediaUrlField
                    label="Specular map (tuỳ chọn)"
                    description="Grayscale — MeshPhong specularMap."
                    value={selected.specularMapUrl}
                    onChange={(url) => patchSelected({ specularMapUrl: url })}
                    accept="image/jpeg,image/png,image/webp"
                    uploadContext={showcaseUploadContext(selected.entityId, 'specular')}
                  />
                  {cloudDuplicatesDiffuse ? (
                    <p className="text-[11px] text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2">
                      Cloud đang trùng URL với Diffuse — renderer sẽ bỏ qua lớp cloud (tránh mất nửa sphere).
                      Xóa URL Cloud hoặc dùng ảnh alpha riêng (chỉ Trái Đất / khí quyển).
                    </p>
                  ) : null}
                  <ShowcaseMediaUrlField
                    label="Cloud / alpha layer (tuỳ chọn)"
                    description="Chỉ cho lớp mây/khí quyển có kênh alpha — không dán lại diffuse (moon/planet thường để trống)."
                    value={selected.cloudMapUrl}
                    onChange={(url) => patchSelected({ cloudMapUrl: url })}
                    accept="image/png,image/webp"
                    uploadContext={showcaseUploadContext(selected.entityId, 'cloud')}
                  />
                </div>

                {previewEntity ? (
                  <div className="border-t border-ds-border pt-4">
                    <ShowcaseEntityPreviewCard entity={previewEntity} effectiveTextureUrl={effectiveTextureUrl} />
                  </div>
                ) : null}

                <div className="border-t border-ds-border pt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Model 3D</p>
                  <ShowcaseMediaUrlField
                    label="glB (tuỳ chọn)"
                    description="Một file .glb tự chứa mesh + texture. URL tự điền sau upload (S3: …/model.glb). Nhớ bấm Lưu."
                    value={selected.modelUrl}
                    onChange={(url) => patchSelected({ modelUrl: url })}
                    accept=".glb,model/gltf-binary"
                    uploadContext={showcaseUploadContext(selected.entityId, 'model')}
                  />
                </div>

                <div className="border-t border-ds-border pt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                    Orbit model (hierarchical)
                  </p>
                  <button
                    type="button"
                    disabled={syncingJpl}
                    onClick={() => void syncSelectedFromJpl()}
                    className="rounded-md border border-ds-accent-strong px-3 py-1.5 text-xs text-ds-accent hover:bg-ds-accent-soft disabled:opacity-50"
                  >
                    {syncingJpl ? 'Đang sync JPL…' : 'Sync from JPL (entity này)'}
                  </button>
                  <label className="block text-xs text-ds-muted">
                    Horizons ID (vd: 399 Earth, 301 Moon)
                    <input
                      value={selected.horizonsId}
                      onChange={(e) => patchSelected({ horizonsId: e.target.value })}
                      placeholder="301"
                      className="studio-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-ds-muted">
                    Parent entityId (scene graph parent)
                    <input
                      value={selected.parentId}
                      onChange={(e) => patchSelected({ parentId: e.target.value })}
                      placeholder="planet-earth"
                      className="studio-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-ds-muted">
                    Neo quanh hành tinh (Explore 3D)
                    <span className="block text-[11px] text-ds-subtle mt-0.5 font-normal normal-case tracking-normal">
                      Tên phải khớp mô phỏng (Mercury…Neptune). Explore neo mesh theo tên này khi không có group 3D
                      cho parentId — nên chọn thay vì chỉ gõ parentId.
                    </span>
                    <select
                      value={parentPlanetSelectValue}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        if (!v) {
                          patchSelected({ parentPlanetName: '' })
                          return
                        }
                        patchSelected({
                          parentPlanetName: v,
                          parentId: `planet-${v.toLowerCase()}`,
                        })
                      }}
                      className="studio-field mt-1"
                    >
                      <option value="">— Không chọn (giữ parentId như hiện tại) —</option>
                      {planetsData.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.nameVi} ({p.name})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-ds-muted">
                    Orbit around (Horizons center, vd: 500@399 cho Moon quanh Earth)
                    <input
                      value={selected.orbitAround}
                      onChange={(e) => patchSelected({ orbitAround: e.target.value })}
                      placeholder="500@10 hoặc 500@399"
                      className="studio-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-ds-muted">
                    Orbit color
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={orbitColorHex}
                        onChange={(e) => patchSelected({ orbitColor: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded border border-ds-border-strong bg-black/40"
                      />
                      <input
                        value={selected.orbitColor || ''}
                        onChange={(e) => patchSelected({ orbitColor: e.target.value })}
                        placeholder="#64748b"
                        className="studio-field mt-1"
                      />
                    </div>
                    <div className="mt-2 rounded-md border border-ds-border bg-black/25 p-3 space-y-3">
                      <div
                        className="h-8 rounded border border-ds-border"
                        style={{ backgroundColor: orbitColorHex }}
                      />
                      <label className="block text-[11px] text-ds-muted">
                        Hue ({orbitHsl.h})
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={orbitHsl.h}
                          onChange={(e) =>
                            patchSelected({
                              orbitColor: hslToHex(Number(e.target.value || 0), orbitHsl.s, orbitHsl.l),
                            })
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label className="block text-[11px] text-ds-muted">
                        Saturation ({orbitHsl.s}%)
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={orbitHsl.s}
                          onChange={(e) =>
                            patchSelected({
                              orbitColor: hslToHex(orbitHsl.h, Number(e.target.value || 0), orbitHsl.l),
                            })
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label className="block text-[11px] text-ds-muted">
                        Lightness ({orbitHsl.l}%)
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={orbitHsl.l}
                          onChange={(e) =>
                            patchSelected({
                              orbitColor: hslToHex(orbitHsl.h, orbitHsl.s, Number(e.target.value || 0)),
                            })
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                    </div>
                    <div className="mt-2 grid grid-cols-9 gap-2">
                      {ORBIT_COLOR_PRESETS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          onClick={() => patchSelected({ orbitColor: hex })}
                          className="h-6 w-6 rounded border border-ds-border-strong"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </label>
                  <label className="block text-xs text-ds-muted">
                    Radius (km)
                    <input
                      type="number"
                      value={selected.radiusKm}
                      onChange={(e) => patchSelected({ radiusKm: Number(e.target.value || 0) })}
                      className="studio-field mt-1"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-ds-muted">
                      a (semi-major)
                      <input type="number" value={selected.orbitalElements?.a ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), a: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                    <label className="block text-xs text-ds-muted">
                      e
                      <input type="number" value={selected.orbitalElements?.e ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), e: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                    <label className="block text-xs text-ds-muted">
                      i (deg)
                      <input type="number" value={selected.orbitalElements?.i ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), i: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                    <label className="block text-xs text-ds-muted">
                      om (deg)
                      <input type="number" value={selected.orbitalElements?.om ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), om: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                    <label className="block text-xs text-ds-muted">
                      w (deg)
                      <input type="number" value={selected.orbitalElements?.w ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), w: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                    <label className="block text-xs text-ds-muted">
                      m (deg)
                      <input type="number" value={selected.orbitalElements?.m ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), m: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                    <label className="block text-xs text-ds-muted col-span-2">
                      periodDays
                      <input type="number" value={selected.orbitalElements?.periodDays ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), periodDays: Number(e.target.value || 0) } })} className="studio-field mt-1" />
                    </label>
                  </div>
                  <label className="block text-xs text-ds-muted">
                    COMMAND (legacy, đồng bộ từ horizonsId)
                    <input
                      value={selected.horizonsCommand}
                      onChange={(e) => patchSelected({ horizonsCommand: e.target.value })}
                      placeholder="Để trống = không gọi JPL cho entity này"
                      className="studio-field mt-1"
                    />
                  </label>
                  <label className="block text-xs text-ds-muted">
                    CENTER (legacy, đồng bộ từ orbitAround)
                    <input
                      value={selected.horizonsCenter}
                      onChange={(e) => patchSelected({ horizonsCenter: e.target.value })}
                      placeholder="500@10"
                      className="studio-field mt-1"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.published}
                    onChange={(e) => patchSelected({ published: e.target.checked })}
                    className="rounded border-ds-border-strong"
                  />
                  Published (ẩn khi bỏ chọn — không áp dụng nội dung &amp; media từ DB)
                </label>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ds-muted">
                  Chỉnh nội dung panel hiển thị trên Showcase theo dạng block trực quan.
                </p>
                <label className="block text-xs text-ds-muted">
                  State badge (always-on)
                  <input
                    value={ensurePanelConfig(selected).stateBadge || ''}
                    onChange={(e) =>
                      patchPanelConfig((cfg) => ({ ...cfg, stateBadge: e.target.value }))
                    }
                    placeholder="Opposition in 12 days · Peak brightness"
                    className="studio-field mt-1"
                  />
                </label>
                <div className="rounded-lg border border-ds-border bg-black/25 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Tabs hiển thị</p>
                  <div className="flex flex-wrap gap-2">
                    {(['overview', 'physical', 'sky'] as const).map((id) => {
                      const checked = (ensurePanelConfig(selected).tabs || []).includes(id)
                      return (
                        <label key={id} className="inline-flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              patchPanelConfig((cfg) => {
                                const cur = new Set(cfg.tabs || [])
                                if (e.target.checked) cur.add(id)
                                else cur.delete(id)
                                return { ...cfg, tabs: Array.from(cur) as Array<'overview' | 'physical' | 'sky'> }
                              })
                            }}
                          />
                          {id}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="rounded-lg border border-ds-border bg-black/25 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Tên tab tùy chỉnh</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(['overview', 'physical', 'sky'] as const).map((id) => (
                      <label key={`tab-label-${id}`} className="block text-xs text-ds-muted">
                        {id}
                        <input
                          value={ensurePanelConfig(selected).tabLabels?.[id] || ''}
                          onChange={(e) =>
                            patchPanelConfig((cfg) => ({
                              ...cfg,
                              tabLabels: {
                                ...(cfg.tabLabels || {}),
                                [id]: e.target.value,
                              },
                            }))
                          }
                          placeholder={id}
                          className="studio-field mt-1"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {(['overviewBlocks', 'physicalBlocks', 'skyBlocks'] as const).map((key) => (
                  <div key={key} className="rounded-lg border border-ds-border bg-black/25 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-300">{key}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => patchPanelConfig((cfg) => ({ ...cfg, [key]: [...(cfg[key] || []), newPanelBlock('text')] }))} className="rounded border border-ds-border-strong px-2 py-1 text-[11px] text-slate-200">+Text</button>
                        <button type="button" onClick={() => patchPanelConfig((cfg) => ({ ...cfg, [key]: [...(cfg[key] || []), newPanelBlock('image')] }))} className="rounded border border-ds-border-strong px-2 py-1 text-[11px] text-slate-200">+Image</button>
                        <button type="button" onClick={() => patchPanelConfig((cfg) => ({ ...cfg, [key]: [...(cfg[key] || []), newPanelBlock('chart')] }))} className="rounded border border-ds-border-strong px-2 py-1 text-[11px] text-slate-200">+Chart</button>
                      </div>
                    </div>
                    {(ensurePanelConfig(selected)[key] || []).map((b, i) => (
                      <div key={b.id || `${key}-${i}`} className="rounded border border-ds-border p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-ds-muted">{b.type}</span>
                          <button
                            type="button"
                            onClick={() =>
                              patchPanelConfig((cfg) => ({
                                ...cfg,
                                [key]: (cfg[key] || []).filter((x) => x.id !== b.id),
                              }))
                            }
                            className="rounded border border-rose-400/30 px-2 py-0.5 text-[10px] text-rose-300"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          value={b.title || ''}
                          onChange={(e) =>
                            patchPanelConfig((cfg) => ({
                              ...cfg,
                              [key]: (cfg[key] || []).map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x)),
                            }))
                          }
                          placeholder="Title"
                          className="studio-field mt-1"
                        />
                        {b.type === 'chart' ? (
                          <div className="rounded-md border border-cyan-500/25 bg-cyan-950/20 p-3 space-y-2">
                            <p className="text-[11px] text-cyan-100/90 leading-relaxed">
                              Chart hiển thị <strong>thanh bar</strong> từ bảng <em>Nhãn + Giá trị</em> — không gõ số liệu vào ô Body.
                            </p>
                            <label className="block text-xs text-ds-muted">
                              Loại biểu đồ
                              <select
                                value={b.chartKind || 'bar'}
                                onChange={(e) =>
                                  patchPanelConfig((cfg) => ({
                                    ...cfg,
                                    [key]: (cfg[key] || []).map((x) =>
                                      x.id === b.id ? { ...x, chartKind: e.target.value } : x,
                                    ),
                                  }))
                                }
                                className="studio-field mt-1"
                              >
                                <option value="bar">bar (thanh ngang)</option>
                              </select>
                            </label>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">Điểm dữ liệu</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchPanelConfig((cfg) => ({
                                      ...cfg,
                                      [key]: (cfg[key] || []).map((x) =>
                                        x.id === b.id
                                          ? {
                                              ...x,
                                              points: [...(x.points || []), { label: 'Chỉ số mới', value: 0 }],
                                            }
                                          : x,
                                      ),
                                    }))
                                  }
                                  className="rounded border border-ds-border-strong px-2 py-0.5 text-[10px] text-slate-200"
                                >
                                  + Thêm dòng
                                </button>
                              </div>
                              {(b.points || []).map((p, pointIdx) => (
                                <div key={`${b.id}-pt-${pointIdx}`} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                                  <label className="block text-[11px] text-ds-muted">
                                    Nhãn
                                    <input
                                      value={p.label}
                                      onChange={(e) =>
                                        patchPanelConfig((cfg) => ({
                                          ...cfg,
                                          [key]: (cfg[key] || []).map((x) => {
                                            if (x.id !== b.id) return x
                                            const points = [...(x.points || [])]
                                            points[pointIdx] = { ...points[pointIdx], label: e.target.value }
                                            return { ...x, points }
                                          }),
                                        }))
                                      }
                                      placeholder="vd: Bán kính (km)"
                                      className="studio-field mt-1"
                                    />
                                  </label>
                                  <label className="block text-[11px] text-ds-muted">
                                    Giá trị
                                    <input
                                      type="number"
                                      step="any"
                                      value={Number.isFinite(p.value) ? p.value : ''}
                                      onChange={(e) =>
                                        patchPanelConfig((cfg) => ({
                                          ...cfg,
                                          [key]: (cfg[key] || []).map((x) => {
                                            if (x.id !== b.id) return x
                                            const points = [...(x.points || [])]
                                            points[pointIdx] = {
                                              ...points[pointIdx],
                                              value: Number(e.target.value),
                                            }
                                            return { ...x, points }
                                          }),
                                        }))
                                      }
                                      placeholder="6371"
                                      className="studio-field mt-1"
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchPanelConfig((cfg) => ({
                                        ...cfg,
                                        [key]: (cfg[key] || []).map((x) =>
                                          x.id === b.id
                                            ? {
                                                ...x,
                                                points: (x.points || []).filter((_, i) => i !== pointIdx),
                                              }
                                            : x,
                                        ),
                                      }))
                                    }
                                    className="rounded border border-rose-400/30 px-2 py-1.5 text-[10px] text-rose-300"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ))}
                              {(b.points || []).length === 0 ? (
                                <p className="text-[11px] text-amber-200/80">Chưa có điểm nào — bấm «+ Thêm dòng».</p>
                              ) : null}
                            </div>
                            <label className="block text-xs text-ds-muted">
                              Ghi chú dưới chart (tuỳ chọn)
                              <textarea
                                value={b.body || ''}
                                onChange={(e) =>
                                  patchPanelConfig((cfg) => ({
                                    ...cfg,
                                    [key]: (cfg[key] || []).map((x) =>
                                      x.id === b.id ? { ...x, body: e.target.value } : x,
                                    ),
                                  }))
                                }
                                rows={2}
                                placeholder="Nguồn số liệu, footnote…"
                                className="studio-field mt-1"
                              />
                            </label>
                          </div>
                        ) : (
                          <textarea
                            value={b.body || ''}
                            onChange={(e) =>
                              patchPanelConfig((cfg) => ({
                                ...cfg,
                                [key]: (cfg[key] || []).map((x) => (x.id === b.id ? { ...x, body: e.target.value } : x)),
                              }))
                            }
                            rows={2}
                            placeholder="Body"
                            className="studio-field mt-1"
                          />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="block text-xs text-ds-muted">
                            Variant
                            <select
                              value={b.style?.variant || 'glass'}
                              onChange={(e) =>
                                patchPanelConfig((cfg) => ({
                                  ...cfg,
                                  [key]: (cfg[key] || []).map((x) =>
                                    x.id === b.id
                                      ? { ...x, style: { ...(x.style || {}), variant: e.target.value as 'glass' | 'solid' | 'minimal' } }
                                      : x
                                  ),
                                }))
                              }
                              className="studio-field mt-1"
                            >
                              <option value="glass">glass</option>
                              <option value="solid">solid</option>
                              <option value="minimal">minimal</option>
                            </select>
                          </label>
                          <label className="block text-xs text-ds-muted">
                            Align
                            <select
                              value={b.style?.align || 'left'}
                              onChange={(e) =>
                                patchPanelConfig((cfg) => ({
                                  ...cfg,
                                  [key]: (cfg[key] || []).map((x) =>
                                    x.id === b.id
                                      ? { ...x, style: { ...(x.style || {}), align: e.target.value as 'left' | 'center' | 'right' } }
                                      : x
                                  ),
                                }))
                              }
                              className="studio-field mt-1"
                            >
                              <option value="left">left</option>
                              <option value="center">center</option>
                              <option value="right">right</option>
                            </select>
                          </label>
                          <label className="block text-xs text-ds-muted">
                            Background
                            <input
                              type="color"
                              value={(b.style?.bgColor && /^#[0-9a-fA-F]{6}$/.test(b.style.bgColor) ? b.style.bgColor : '#111827')}
                              onChange={(e) =>
                                patchPanelConfig((cfg) => ({
                                  ...cfg,
                                  [key]: (cfg[key] || []).map((x) =>
                                    x.id === b.id ? { ...x, style: { ...(x.style || {}), bgColor: e.target.value } } : x
                                  ),
                                }))
                              }
                              className="h-10 w-full rounded-lg border border-ds-border-strong bg-black/50"
                            />
                          </label>
                          <label className="block text-xs text-ds-muted">
                            Border
                            <input
                              type="color"
                              value={(b.style?.borderColor && /^#[0-9a-fA-F]{6}$/.test(b.style.borderColor) ? b.style.borderColor : '#334155')}
                              onChange={(e) =>
                                patchPanelConfig((cfg) => ({
                                  ...cfg,
                                  [key]: (cfg[key] || []).map((x) =>
                                    x.id === b.id ? { ...x, style: { ...(x.style || {}), borderColor: e.target.value } } : x
                                  ),
                                }))
                              }
                              className="h-10 w-full rounded-lg border border-ds-border-strong bg-black/50"
                            />
                          </label>
                          <label className="block text-xs text-ds-muted">
                            Text color
                            <input
                              type="color"
                              value={(b.style?.textColor && /^#[0-9a-fA-F]{6}$/.test(b.style.textColor) ? b.style.textColor : '#e2e8f0')}
                              onChange={(e) =>
                                patchPanelConfig((cfg) => ({
                                  ...cfg,
                                  [key]: (cfg[key] || []).map((x) =>
                                    x.id === b.id ? { ...x, style: { ...(x.style || {}), textColor: e.target.value } } : x
                                  ),
                                }))
                              }
                              className="h-10 w-full rounded-lg border border-ds-border-strong bg-black/50"
                            />
                          </label>
                          <label className="block text-xs text-ds-muted">
                            Accent color
                            <input
                              type="color"
                              value={(b.style?.accentColor && /^#[0-9a-fA-F]{6}$/.test(b.style.accentColor) ? b.style.accentColor : '#22d3ee')}
                              onChange={(e) =>
                                patchPanelConfig((cfg) => ({
                                  ...cfg,
                                  [key]: (cfg[key] || []).map((x) =>
                                    x.id === b.id ? { ...x, style: { ...(x.style || {}), accentColor: e.target.value } } : x
                                  ),
                                }))
                              }
                              className="h-10 w-full rounded-lg border border-ds-border-strong bg-black/50"
                            />
                          </label>
                        </div>
                        {b.type === 'image' ? (
                          <ShowcaseMediaUrlField
                            label="Image URL"
                            value={b.imageUrl || ''}
                            onChange={(url) =>
                              patchPanelConfig((cfg) => ({
                                ...cfg,
                                [key]: (cfg[key] || []).map((x) => (x.id === b.id ? { ...x, imageUrl: url } : x)),
                              }))
                            }
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            uploadContext={showcaseUploadContext(
                              selected.entityId,
                              `panel-${key}-${b.id}`,
                            )}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="rounded-lg border border-ds-border bg-black/25 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-300 mb-2">Tag concepts</p>
                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1">
                    {concepts.map((c) => {
                      const checked = (ensurePanelConfig(selected).conceptTagIds || []).includes(c.id)
                      return (
                        <label key={c.id} className="inline-flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              patchPanelConfig((cfg) => {
                                const cur = new Set(cfg.conceptTagIds || [])
                                if (e.target.checked) cur.add(c.id)
                                else cur.delete(c.id)
                                return { ...cfg, conceptTagIds: Array.from(cur) }
                              })
                            }
                          />
                          {c.title || c.id}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-ds-border bg-black/25 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-300 mb-2">Lessons in learning path</p>
                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1">
                    {lessonOptions.map((l) => {
                      const checked = (ensurePanelConfig(selected).lessonIds || []).includes(l.id)
                      return (
                        <label key={l.id} className="inline-flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              patchPanelConfig((cfg) => {
                                const cur = new Set(cfg.lessonIds || [])
                                if (e.target.checked) cur.add(l.id)
                                else cur.delete(l.id)
                                return { ...cfg, lessonIds: Array.from(cur) }
                              })
                            }
                          />
                          {l.title}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
            ) : null}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? 'Đang lưu…' : 'Lưu toàn bộ catalog'}
              </button>
              {message ? <span className="text-sm text-ds-muted">{message}</span> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudioShowcaseEntitiesPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-ds-muted text-sm">
          Đang tải…
        </div>
      }
    >
      <StudioShowcaseEntitiesPage />
    </Suspense>
  )
}
