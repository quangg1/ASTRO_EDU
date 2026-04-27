'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getNasaCatalogItemById, NASA_SHOWCASE_ITEMS } from '@/lib/showcaseEntities'
import { planetsData } from '@/lib/solarSystemData'
import {
  fetchEditorShowcaseEntityContents,
  saveShowcaseEntityContents,
  type ShowcasePanelBlockDTO,
  type ShowcaseEntityContentDTO,
} from '@/lib/showcaseEntitiesApi'
import { useAuthStore } from '@/store/useAuthStore'
import { useShowcaseCatalogGen } from '@/components/showcase/ShowcaseCatalogProvider'
import { ShowcaseMediaUrlField } from '@/app/studio/showcase-entities/ShowcaseMediaUrlField'
import { ShowcaseEntityPreviewCard } from '@/app/studio/showcase-entities/ShowcaseEntityPreviewCard'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { syncShowcaseOrbitEntityFromJpl } from '@/lib/showcaseOrbitsApi'
import type { ShowcaseOrbitEntity } from '@/lib/showcaseEntities'
import { useLearningPath } from '@/hooks/useLearningPath'

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

function buildInitialRows(db: ShowcaseEntityContentDTO[] | null): ShowcaseEntityContentDTO[] {
  const m = new Map((db || []).map((r) => [String(r.entityId || '').trim(), r]))
  return NASA_SHOWCASE_ITEMS.map((b) => {
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
    chartKind: '',
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

export default function StudioShowcaseEntitiesPage() {
  const router = useRouter()
  const showcaseCatalogGen = useShowcaseCatalogGen()
  const { user, checked } = useAuthStore()
  const [rows, setRows] = useState<ShowcaseEntityContentDTO[]>([])
  const [selectedId, setSelectedId] = useState<string>(NASA_SHOWCASE_ITEMS[0]?.id ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingJpl, setSyncingJpl] = useState(false)
  const [message, setMessage] = useState('')
  const [studioTab, setStudioTab] = useState<'media' | 'panel'>('media')
  const lastLoadedKeyRef = useRef('')
  const { modules, concepts } = useLearningPath()

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/showcase-entities')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  const load = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    const db = await fetchEditorShowcaseEntityContents(token)
    setRows(buildInitialRows(db))
    setLoading(false)
  }, [showcaseCatalogGen])

  useEffect(() => {
    const uid = String(user?.id || '')
    if (!uid) return
    const key = `${uid}:${showcaseCatalogGen}`
    if (lastLoadedKeyRef.current === key) return
    lastLoadedKeyRef.current = key
    void load()
  }, [user?.id, showcaseCatalogGen, load])

  useEffect(() => {
    if (selectedId) return
    const first = rows[0]?.entityId || NASA_SHOWCASE_ITEMS[0]?.id || ''
    if (first) setSelectedId(first)
  }, [rows, selectedId])

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
    [selectedId],
  )
  const effectiveTextureUrl = useMemo(() => {
    const d = selected?.diffuseMapUrl?.trim() || ''
    if (d) return resolveMediaUrl(d)
    if (selectedBase?.texturePath) return resolveMediaUrl(selectedBase.texturePath)
    return ''
  }, [selected?.diffuseMapUrl, selectedBase?.texturePath])
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) return
    setSaving(true)
    setMessage('')
    const payload = rows.map((r) => ({
      ...r,
      textureUrl: r.diffuseMapUrl?.trim() || r.textureUrl?.trim() || '',
      horizonsCommand: r.horizonsId?.trim() || r.horizonsCommand?.trim() || '',
      horizonsCenter: r.orbitAround?.trim() || r.horizonsCenter?.trim() || '',
    }))
    const r = await saveShowcaseEntityContents(token, payload)
    setSaving(false)
    if (r.ok && r.items) {
      setRows(buildInitialRows(r.items))
      setMessage('Đã lưu.')
    } else {
      setMessage(r.error || 'Lỗi lưu')
    }
  }

  const syncSelectedFromJpl = async () => {
    if (!selected) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('galaxies_token') : null
    if (!token) return
    setSyncingJpl(true)
    setMessage('')
    const r = await syncShowcaseOrbitEntityFromJpl(token, selected.entityId)
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
    setMessage('Đã sync dữ liệu JPL cho entity hiện tại. Bấm Lưu để ghi DB.')
  }

  const inputCls =
    'w-full mt-1 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none'

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra đăng nhập...</div>
  }

  return (
    <div className="min-h-screen bg-[#050508] pt-14 pb-10 px-3 md:px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <nav className="text-sm">
          <Link href="/studio" className="text-cyan-400 hover:text-cyan-300">
            ← Studio
          </Link>
        </nav>
        <div className="rounded-2xl border border-white/10 bg-[#0a0f17] p-5">
          <h1 className="text-xl font-semibold text-white">Showcase entity — media &amp; copy</h1>
          <p className="text-sm text-slate-400 mt-2">
            Upload ảnh / glTF qua API (S3 hoặc <code className="text-cyan-300/90">/files/</code> khi dev). URL lưu
            trong DB; Explore load qua CDN. Hành tinh dạng cầu: diffuse + tuỳ chọn normal, specular, cloud; tiểu
            hành tinh / tàu: thêm model glTF/glB.
          </p>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Đang tải…</p>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0a0f17] p-5 space-y-4">
            <label className="block text-xs text-slate-400">
              Entity
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className={inputCls}
              >
                {NASA_SHOWCASE_ITEMS.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.id})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudioTab('media')}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  studioTab === 'media'
                    ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                    : 'border-white/15 text-slate-300 hover:bg-white/10'
                }`}
              >
                Media & Orbit
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('panel')}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  studioTab === 'panel'
                    ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                    : 'border-white/15 text-slate-300 hover:bg-white/10'
                }`}
              >
                Panel content
              </button>
            </div>

            {selected ? (
              studioTab === 'media' ? (
              <>
                <label className="block text-xs text-slate-400">
                  Tên hiển thị (Tiếng Việt, tuỳ chọn)
                  <input
                    value={selected.nameVi}
                    onChange={(e) => patchSelected({ nameVi: e.target.value })}
                    placeholder="Để trống = dùng tên EN mặc định trong catalog"
                    className={inputCls}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Nhãn museum / mô tả ngắn (VI)
                  <textarea
                    value={selected.museumBlurbVi}
                    onChange={(e) => patchSelected({ museumBlurbVi: e.target.value })}
                    rows={5}
                    placeholder="Hiển thị trên Explore (Layer 1). Để trống = dùng copy mặc định trong code."
                    className={inputCls}
                  />
                </label>

                <label className="block text-xs text-slate-400">
                  Panel config (JSON) — chỉnh badge/tabs/blocks text-image-chart
                  <textarea
                    value={JSON.stringify(selected.panelConfig || null, null, 2)}
                    onChange={(e) => {
                      const raw = e.target.value
                      try {
                        const parsed = raw.trim() ? JSON.parse(raw) : null
                        patchSelected({ panelConfig: parsed })
                        setMessage('')
                      } catch {
                        setMessage('Panel config JSON chưa hợp lệ')
                      }
                    }}
                    rows={10}
                    placeholder={`{
  "stateBadge": "Ring tilt 9.2° · Decreasing toward edge-on",
  "tabs": ["overview","physical","sky"],
  "overviewBlocks": [
    { "id": "o1", "type": "text", "title": "Now", "body": "Best evening visibility this week." },
    { "id": "o2", "type": "image", "title": "Reference", "imageUrl": "https://..." }
  ],
  "physicalBlocks": [
    { "id": "p1", "type": "chart", "title": "Atmosphere mix", "points": [ { "label": "CO2", "value": 96.5 } ] }
  ],
  "skyBlocks": [
    { "id": "s1", "type": "text", "title": "Tonight", "body": "Opposition in 12 days." }
  ]
}`}
                    className={inputCls}
                  />
                </label>

                <div className="border-t border-white/10 pt-4 space-y-4">
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Maps (sphere)</p>
                  <div className="rounded-md border border-white/10 bg-black/25 p-2">
                    <p className="text-[11px] text-slate-500">Effective texture URL</p>
                    <p className="text-[11px] text-cyan-300 font-mono break-all">
                      {effectiveTextureUrl || '(chưa có)'}
                    </p>
                  </div>
                  <ShowcaseMediaUrlField
                    label="Diffuse / albedo"
                    description="Bắt buộc để thay texture tĩnh trong bundle. JPG/PNG/WebP."
                    value={selected.diffuseMapUrl}
                    onChange={(url) => patchSelected({ diffuseMapUrl: url, textureUrl: url })}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                  />
                  <ShowcaseMediaUrlField
                    label="Normal map (tuỳ chọn)"
                    value={selected.normalMapUrl}
                    onChange={(url) => patchSelected({ normalMapUrl: url })}
                    accept="image/jpeg,image/png,image/webp"
                  />
                  <ShowcaseMediaUrlField
                    label="Specular map (tuỳ chọn)"
                    description="Grayscale — MeshPhong specularMap."
                    value={selected.specularMapUrl}
                    onChange={(url) => patchSelected({ specularMapUrl: url })}
                    accept="image/jpeg,image/png,image/webp"
                  />
                  <ShowcaseMediaUrlField
                    label="Cloud / alpha layer (tuỳ chọn)"
                    description="Lớp ngoài trong suốt; nên có kênh alpha."
                    value={selected.cloudMapUrl}
                    onChange={(url) => patchSelected({ cloudMapUrl: url })}
                    accept="image/png,image/webp"
                  />
                </div>

                {previewEntity ? (
                  <div className="border-t border-white/10 pt-4">
                    <ShowcaseEntityPreviewCard entity={previewEntity} effectiveTextureUrl={effectiveTextureUrl} />
                  </div>
                ) : null}

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">Model 3D</p>
                  <ShowcaseMediaUrlField
                    label="glTF / glB (tuỳ chọn)"
                    description="Khi có URL — runtime dùng model thay vì sphere + maps. Ghi đè modelPath tĩnh trong catalog."
                    value={selected.modelUrl}
                    onChange={(url) => patchSelected({ modelUrl: url })}
                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                  />
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                    Orbit model (hierarchical)
                  </p>
                  <button
                    type="button"
                    disabled={syncingJpl}
                    onClick={() => void syncSelectedFromJpl()}
                    className="rounded-md border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
                  >
                    {syncingJpl ? 'Đang sync JPL…' : 'Sync from JPL (entity này)'}
                  </button>
                  <label className="block text-xs text-slate-400">
                    Horizons ID (vd: 399 Earth, 301 Moon)
                    <input
                      value={selected.horizonsId}
                      onChange={(e) => patchSelected({ horizonsId: e.target.value })}
                      placeholder="301"
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Parent entityId (scene graph parent)
                    <input
                      value={selected.parentId}
                      onChange={(e) => patchSelected({ parentId: e.target.value })}
                      placeholder="planet-earth"
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Neo quanh hành tinh (Explore 3D)
                    <span className="block text-[11px] text-slate-500 mt-0.5 font-normal normal-case tracking-normal">
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
                      className={inputCls}
                    >
                      <option value="">— Không chọn (giữ parentId như hiện tại) —</option>
                      {planetsData.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.nameVi} ({p.name})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-slate-400">
                    Orbit around (Horizons center, vd: 500@399 cho Moon quanh Earth)
                    <input
                      value={selected.orbitAround}
                      onChange={(e) => patchSelected({ orbitAround: e.target.value })}
                      placeholder="500@10 hoặc 500@399"
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    Orbit color
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={orbitColorHex}
                        onChange={(e) => patchSelected({ orbitColor: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded border border-white/15 bg-black/40"
                      />
                      <input
                        value={selected.orbitColor || ''}
                        onChange={(e) => patchSelected({ orbitColor: e.target.value })}
                        placeholder="#64748b"
                        className={inputCls}
                      />
                    </div>
                    <div className="mt-2 rounded-md border border-white/10 bg-black/25 p-3 space-y-3">
                      <div
                        className="h-8 rounded border border-white/10"
                        style={{ backgroundColor: orbitColorHex }}
                      />
                      <label className="block text-[11px] text-slate-400">
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
                      <label className="block text-[11px] text-slate-400">
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
                      <label className="block text-[11px] text-slate-400">
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
                          className="h-6 w-6 rounded border border-white/20"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </label>
                  <label className="block text-xs text-slate-400">
                    Radius (km)
                    <input
                      type="number"
                      value={selected.radiusKm}
                      onChange={(e) => patchSelected({ radiusKm: Number(e.target.value || 0) })}
                      className={inputCls}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-slate-400">
                      a (semi-major)
                      <input type="number" value={selected.orbitalElements?.a ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), a: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                    <label className="block text-xs text-slate-400">
                      e
                      <input type="number" value={selected.orbitalElements?.e ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), e: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                    <label className="block text-xs text-slate-400">
                      i (deg)
                      <input type="number" value={selected.orbitalElements?.i ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), i: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                    <label className="block text-xs text-slate-400">
                      om (deg)
                      <input type="number" value={selected.orbitalElements?.om ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), om: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                    <label className="block text-xs text-slate-400">
                      w (deg)
                      <input type="number" value={selected.orbitalElements?.w ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), w: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                    <label className="block text-xs text-slate-400">
                      m (deg)
                      <input type="number" value={selected.orbitalElements?.m ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), m: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                    <label className="block text-xs text-slate-400 col-span-2">
                      periodDays
                      <input type="number" value={selected.orbitalElements?.periodDays ?? 0} onChange={(e) => patchSelected({ orbitalElements: { ...(selected.orbitalElements || { a: 0, e: 0, i: 0, om: 0, w: 0, m: 0, periodDays: 0 }), periodDays: Number(e.target.value || 0) } })} className={inputCls} />
                    </label>
                  </div>
                  <label className="block text-xs text-slate-400">
                    COMMAND (legacy, đồng bộ từ horizonsId)
                    <input
                      value={selected.horizonsCommand}
                      onChange={(e) => patchSelected({ horizonsCommand: e.target.value })}
                      placeholder="Để trống = không gọi JPL cho entity này"
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-xs text-slate-400">
                    CENTER (legacy, đồng bộ từ orbitAround)
                    <input
                      value={selected.horizonsCenter}
                      onChange={(e) => patchSelected({ horizonsCenter: e.target.value })}
                      placeholder="500@10"
                      className={inputCls}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.published}
                    onChange={(e) => patchSelected({ published: e.target.checked })}
                    className="rounded border-white/20"
                  />
                  Published (ẩn khi bỏ chọn — không áp dụng nội dung &amp; media từ DB)
                </label>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Chỉnh nội dung panel hiển thị trên Showcase theo dạng block trực quan.
                </p>
                <label className="block text-xs text-slate-400">
                  State badge (always-on)
                  <input
                    value={ensurePanelConfig(selected).stateBadge || ''}
                    onChange={(e) =>
                      patchPanelConfig((cfg) => ({ ...cfg, stateBadge: e.target.value }))
                    }
                    placeholder="Opposition in 12 days · Peak brightness"
                    className={inputCls}
                  />
                </label>
                <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
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
                <div className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Tên tab tùy chỉnh</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(['overview', 'physical', 'sky'] as const).map((id) => (
                      <label key={`tab-label-${id}`} className="block text-xs text-slate-400">
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
                          className={inputCls}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {(['overviewBlocks', 'physicalBlocks', 'skyBlocks'] as const).map((key) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-300">{key}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => patchPanelConfig((cfg) => ({ ...cfg, [key]: [...(cfg[key] || []), newPanelBlock('text')] }))} className="rounded border border-white/20 px-2 py-1 text-[11px] text-slate-200">+Text</button>
                        <button type="button" onClick={() => patchPanelConfig((cfg) => ({ ...cfg, [key]: [...(cfg[key] || []), newPanelBlock('image')] }))} className="rounded border border-white/20 px-2 py-1 text-[11px] text-slate-200">+Image</button>
                        <button type="button" onClick={() => patchPanelConfig((cfg) => ({ ...cfg, [key]: [...(cfg[key] || []), newPanelBlock('chart')] }))} className="rounded border border-white/20 px-2 py-1 text-[11px] text-slate-200">+Chart</button>
                      </div>
                    </div>
                    {(ensurePanelConfig(selected)[key] || []).map((b, i) => (
                      <div key={b.id || `${key}-${i}`} className="rounded border border-white/10 p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">{b.type}</span>
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
                          className={inputCls}
                        />
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
                          className={inputCls}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="block text-xs text-slate-400">
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
                              className={inputCls}
                            >
                              <option value="glass">glass</option>
                              <option value="solid">solid</option>
                              <option value="minimal">minimal</option>
                            </select>
                          </label>
                          <label className="block text-xs text-slate-400">
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
                              className={inputCls}
                            >
                              <option value="left">left</option>
                              <option value="center">center</option>
                              <option value="right">right</option>
                            </select>
                          </label>
                          <label className="block text-xs text-slate-400">
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
                              className="h-10 w-full rounded-lg border border-white/15 bg-black/50"
                            />
                          </label>
                          <label className="block text-xs text-slate-400">
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
                              className="h-10 w-full rounded-lg border border-white/15 bg-black/50"
                            />
                          </label>
                          <label className="block text-xs text-slate-400">
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
                              className="h-10 w-full rounded-lg border border-white/15 bg-black/50"
                            />
                          </label>
                          <label className="block text-xs text-slate-400">
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
                              className="h-10 w-full rounded-lg border border-white/15 bg-black/50"
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
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
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

                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
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
              {message ? <span className="text-sm text-slate-400">{message}</span> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
