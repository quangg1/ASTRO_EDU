'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  CalendarPlus,
  ChevronLeft,
  Eye,
  Palette,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  createAdminAstronomyEvent,
  deleteAdminAstronomyEvent,
  fetchAdminAstronomyEvents,
  fetchAdminTypeKits,
  importAdminAstronomySuggestions,
  patchAdminAstronomyEvent,
  patchAdminTypeKit,
  publishAdminAstronomyEvent,
} from '@/features/admin/public'
import type {
  AstronomyEventAdmin,
  AstronomyEventType,
  AstronomyEventTypeKit,
} from '@/features/astronomy-calendar/types'
import { AstronomyEventCard } from '@/features/astronomy-calendar/components/AstronomyEventCard'
import { Brackets, EventTypeIcon } from '@/features/astronomy-calendar/components/calendarUiPrimitives'
import {
  ACCENT_PRESETS,
  EVENT_KIND_OPTIONS,
  EVENT_TYPES,
  KIT_ICON_OPTIONS,
  STATUS_LABEL,
  STATUS_OPTIONS,
  TYPE_META,
} from './studioConstants'
import {
  applyKitToDraft,
  buildCreateEventPayload,
  buildPreviewCalendarEvent,
  emptyEventDraft,
  formatEventListDate,
  fromDatetimeLocal,
  kitMapFromList,
  slugifyEventId,
  sortEventsByStartAt,
  toDatetimeLocal,
} from './studioHelpers'
import {
  EXPLORE_TARGET_SUGGESTIONS,
  flattenLpLessons,
  type LessonLinkOption,
} from './lessonLinkHelpers'
import { fetchPublicLearningPath } from '@/features/learning-path/public'
import { Spinner } from '@/components/ui/Spinner'

type Tab = 'events' | 'kits'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/20'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {hint ? <span className="block text-[11px] leading-snug text-slate-500">{hint}</span> : null}
      {children}
    </label>
  )
}

function StudioPanel({
  children,
  accent = 'var(--color-accent)',
  className = '',
}: {
  children: React.ReactNode
  accent?: string
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(6,9,26,0.72)] ${className}`}
      style={{ boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 8%, transparent)` }}
    >
      <Brackets c={accent} />
      {children}
    </div>
  )
}

export function AstronomyCalendarStudio({ title = 'Studio · Lịch Thiên Văn' }: { title?: string }) {
  const [tab, setTab] = useState<Tab>('events')
  const [rows, setRows] = useState<AstronomyEventAdmin[]>([])
  const [kits, setKits] = useState<AstronomyEventTypeKit[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedKitType, setSelectedKitType] = useState<AstronomyEventType>('moon_phase')
  const [draft, setDraft] = useState<Partial<AstronomyEventAdmin>>({})
  const [kitDraft, setKitDraft] = useState<Partial<AstronomyEventTypeKit>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgIsError, setMsgIsError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [lessonOptions, setLessonOptions] = useState<LessonLinkOption[]>([])
  const [lessonPicker, setLessonPicker] = useState('')

  const kitMap = useMemo(() => kitMapFromList(kits), [kits])
  const selected = useMemo(
    () => (isCreating ? null : rows.find((r) => r.id === selectedId) ?? null),
    [rows, selectedId, isCreating],
  )
  const selectedKit = useMemo(
    () => kits.find((k) => k.type === selectedKitType) ?? null,
    [kits, selectedKitType],
  )
  const activeKit = kitMap[draft.type || 'moon_phase'] || selectedKit

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (monthFilter) {
        const d = new Date(row.startAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key !== monthFilter) return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (
          !row.titleVi.toLowerCase().includes(q) &&
          !row.eventId.toLowerCase().includes(q) &&
          !row.type.includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [rows, statusFilter, monthFilter, search])

  const monthOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of rows) {
      const d = new Date(row.startAt)
      if (!Number.isNaN(d.getTime())) {
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }
    }
    return Array.from(set).sort()
  }, [rows])

  const previewEvent = useMemo(
    () => buildPreviewCalendarEvent(draft, activeKit || null),
    [draft, activeKit],
  )
  const kitPreviewEvent = useMemo(() => {
    const kit: AstronomyEventTypeKit = {
      type: selectedKitType,
      typeLabelVi: String(kitDraft.typeLabelVi || TYPE_META[selectedKitType].labelVi),
      legendLabelVi: String(kitDraft.legendLabelVi || ''),
      legendGroup: kitDraft.legendGroup || 'moon',
      accentColor: kitDraft.accentColor || null,
      iconKey: String(kitDraft.iconKey || TYPE_META[selectedKitType].defaultIcon),
      defaultVisibilityLabelVi: String(kitDraft.defaultVisibilityLabelVi || ''),
      defaultObservationTipsVi: String(kitDraft.defaultObservationTipsVi || ''),
      descriptionHintVi: String(kitDraft.descriptionHintVi || ''),
    }
    return buildPreviewCalendarEvent(
      {
        titleVi: kit.typeLabelVi,
        type: selectedKitType,
        summaryVi: kit.descriptionHintVi,
        descriptionVi: kit.descriptionHintVi,
        observationTipsVi: kit.defaultObservationTipsVi,
        visibilityLabelVi: kit.defaultVisibilityLabelVi,
        typeLabelVi: kit.typeLabelVi,
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString(),
        peakAt: new Date().toISOString(),
      },
      kit,
    )
  }, [kitDraft, selectedKitType])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [events, typeKits] = await Promise.all([fetchAdminAstronomyEvents(), fetchAdminTypeKits()])
      setRows(events)
      setKits(typeKits)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Không tải được danh sách sự kiện')
      setMsgIsError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void fetchPublicLearningPath().then((modules) => {
      if (modules?.length) setLessonOptions(flattenLpLessons(modules))
    })
  }, [])

  useEffect(() => {
    if (selected) {
      setDraft(selected)
      setIsCreating(false)
      setLessonPicker(selected.lessonHref || '')
    }
  }, [selected])

  useEffect(() => {
    if (selectedKit) setKitDraft(selectedKit)
  }, [selectedKit])

  const handleImport = async (publish: boolean) => {
    setBusy(true)
    setMsg(null)
    const res = await importAdminAstronomySuggestions(365, publish)
    setBusy(false)
    if (res.success && res.data) {
      setMsg(`Import: ${res.data.created} mới, ${res.data.updated} cập nhật`)
      void load()
    } else {
      setMsg(res.error || 'Lỗi import')
    }
  }

  const startCreate = () => {
    const type = (draft.type || selectedKitType || 'moon_phase') as AstronomyEventType
    const kit = kitMap[type] || kitMap.moon_phase
    setIsCreating(true)
    setSelectedId(null)
    setDraft(emptyEventDraft(kit))
    setMsg(null)
    setMsgIsError(false)
  }

  const handleTypeChange = (type: AstronomyEventType) => {
    const kit = kitMap[type]
    setDraft((d) => applyKitToDraft({ ...d, type }, kit))
  }

  const saveEvent = async () => {
    setBusy(true)
    setMsg(null)
    setMsgIsError(false)

    try {
      if (isCreating) {
        const startAt = draft.startAt
        const endAt = draft.endAt
        const titleVi = String(draft.titleVi || '').trim()
        if (!titleVi || !startAt || !endAt) {
          setMsg('Cần tiêu đề, ngày bắt đầu và kết thúc')
          setMsgIsError(true)
          return
        }
        if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
          setMsg('Ngày kết thúc phải sau ngày bắt đầu')
          setMsgIsError(true)
          return
        }
        const eventId = String(draft.eventId || '').trim() || slugifyEventId(titleVi, startAt)
        const peakAt = draft.peakAt || startAt
        const res = await createAdminAstronomyEvent(
          buildCreateEventPayload(draft, { eventId, titleVi, startAt, endAt, peakAt }),
        )
        if (res.success && res.data) {
          setMsg('Đã tạo sự kiện mới')
          setMsgIsError(false)
          setRows((prev) => sortEventsByStartAt([...prev.filter((r) => r.id !== res.data!.id), res.data!]))
          setDraft(res.data)
          setSelectedId(res.data.id)
          setIsCreating(false)
          void load()
        } else {
          setMsg(res.error || 'Tạo thất bại')
          setMsgIsError(true)
        }
        return
      }

      if (!selected) {
        setMsg('Chọn sự kiện cần lưu')
        setMsgIsError(true)
        return
      }
      const res = await patchAdminAstronomyEvent(selected.id, draft)
      setMsg(res.success ? 'Đã lưu sự kiện' : res.error || 'Lỗi lưu')
      setMsgIsError(!res.success)
      if (res.success) void load()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi không xác định')
      setMsgIsError(true)
    } finally {
      setBusy(false)
    }
  }

  const removeEvent = async () => {
    if (!selected || isCreating) return
    if (!window.confirm(`Xóa sự kiện "${selected.titleVi}"?`)) return
    setBusy(true)
    const res = await deleteAdminAstronomyEvent(selected.id)
    setBusy(false)
    if (res.success) {
      setSelectedId(null)
      setDraft({})
      void load()
      setMsg('Đã xóa sự kiện')
      setMsgIsError(false)
    } else {
      setMsg(res.error || 'Xóa thất bại')
      setMsgIsError(true)
    }
  }

  const saveKit = async () => {
    setBusy(true)
    setMsg(null)
    const res = await patchAdminTypeKit(selectedKitType, kitDraft)
    setBusy(false)
    setMsg(res.success ? 'Đã lưu bộ thiết kế loại sự kiện' : res.error || 'Lỗi lưu kit')
    if (res.success) void load()
  }

  const publishEvent = async (id: string) => {
    setBusy(true)
    const res = await publishAdminAstronomyEvent(id)
    setBusy(false)
    if (res.success) void load()
    else setMsg(res.error || 'Lỗi publish')
  }

  const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 transition hover:text-sky-300"
          style={mono}
        >
          <ChevronLeft className="h-4 w-4" />
          Studio
        </Link>
        <Link
          href="/calendar"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500 transition hover:text-sky-300"
          style={mono}
        >
          <Eye className="h-4 w-4" />
          Xem lịch học viên
        </Link>
      </div>

      <StudioPanel accent="#22d3ee" className="p-6 sm:p-8">
        <div style={mono} className="mb-2 text-[11px] uppercase tracking-[0.2em] text-sky-400/80">
          // studio · astronomy-calendar
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Tạo và biên tập sự kiện thiên văn — gán ngày, loại thiết kế, icon và màu card. Bộ kit loại sự kiện
          quyết định màu &amp; icon mặc định trên lịch công khai.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 ring-1 ring-sky-400/30 transition hover:bg-sky-500/30 disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" />
            Tạo sự kiện
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleImport(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Import gợi ý (draft)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleImport(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 px-4 py-2 text-sm text-violet-100 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Import + xuất bản
          </button>
        </div>
      </StudioPanel>

      {msg ? (
        <p
          className={`rounded-xl border px-4 py-2 text-sm ${
            msgIsError
              ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
              : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-50'
          }`}
        >
          {msg}
        </p>
      ) : null}

      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
        {(
          [
            ['events', 'Sự kiện'],
            ['kits', 'Bộ thiết kế loại'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === id ? 'bg-sky-500/20 text-sky-100 shadow-inner' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'events' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,0.9fr)]">
          <StudioPanel className="flex max-h-[78vh] flex-col p-4">
            <div className="mb-3 space-y-2">
              <input
                className={inputClass}
                placeholder="Tìm tiêu đề, eventId…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={inputClass}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Mọi trạng thái</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  <option value="">Mọi tháng</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">{filteredRows.length} / {rows.length} sự kiện</p>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {filteredRows.map((row) => {
                const kit = kitMap[row.type]
                const accent = kit?.accentColor || '#38bdf8'
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(row.id)
                      setIsCreating(false)
                    }}
                    className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                      selectedId === row.id && !isCreating
                        ? 'border-sky-400/40 bg-sky-500/10'
                        : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} aria-hidden />
                    <div className="flex items-start gap-2 pl-2">
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10"
                        style={{ background: `color-mix(in srgb, ${accent} 20%, transparent)` }}
                      >
                        <EventTypeIcon
                          type={row.type}
                          iconKey={kit?.iconKey}
                          accent={accent}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{row.titleVi}</p>
                        <p className="text-[10px] text-slate-500">
                          {formatEventListDate(row.startAt)} · {STATUS_LABEL[row.status]}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </StudioPanel>

          <StudioPanel accent={activeKit?.accentColor || '#38bdf8'} className="space-y-4 p-5">
            {selected || isCreating ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {isCreating ? 'Sự kiện mới' : selected?.titleVi}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isCreating ? 'Tạo thủ công trong Studio' : selected?.eventId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isCreating && selected && selected.status !== 'published' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void publishEvent(selected.id)}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100 ring-1 ring-emerald-400/30"
                      >
                        Xuất bản
                      </button>
                    ) : null}
                    {!isCreating && selected ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeEvent()}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 ring-1 ring-rose-400/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    ) : null}
                  </div>
                </div>

                <Field label="Loại thiết kế (bộ kit)" hint="Quyết định icon & màu card trên lịch">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {EVENT_TYPES.map((type) => {
                      const kit = kitMap[type]
                      const accent = kit?.accentColor || '#64748b'
                      const active = draft.type === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTypeChange(type)}
                          className={`rounded-xl border p-3 text-left transition ${
                            active ? 'ring-2 ring-offset-0' : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{
                            borderColor: active ? accent : 'rgba(255,255,255,0.08)',
                            background: `color-mix(in srgb, ${accent} ${active ? '22%' : '10%'}, transparent)`,
                            ...(active ? { boxShadow: `0 0 0 1px ${accent}` } : {}),
                          }}
                        >
                          <EventTypeIcon type={type} iconKey={kit?.iconKey} accent={accent} className="mb-2 h-5 w-5" />
                          <p className="text-xs font-semibold text-white">{TYPE_META[type].labelVi}</p>
                          <p className="text-[10px] text-slate-400">{kit?.typeLabelVi || type}</p>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                {isCreating ? (
                  <Field label="Mã sự kiện (eventId)" hint="Để trống sẽ tự sinh từ tiêu đề + ngày">
                    <input
                      className={inputClass}
                      value={draft.eventId || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, eventId: e.target.value }))}
                    />
                  </Field>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Bắt đầu">
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={toDatetimeLocal(draft.startAt)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, startAt: fromDatetimeLocal(e.target.value) || d.startAt }))
                      }
                    />
                  </Field>
                  <Field label="Kết thúc">
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={toDatetimeLocal(draft.endAt)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, endAt: fromDatetimeLocal(e.target.value) || d.endAt }))
                      }
                    />
                  </Field>
                  <Field label="Đỉnh (peak)">
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={toDatetimeLocal(draft.peakAt)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, peakAt: fromDatetimeLocal(e.target.value) }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Trạng thái">
                    <select
                      className={inputClass}
                      value={draft.status || 'draft'}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          status: e.target.value as AstronomyEventAdmin['status'],
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Loại nội dung">
                    <select
                      className={inputClass}
                      value={draft.eventKind || 'observable'}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          eventKind: e.target.value as AstronomyEventAdmin['eventKind'],
                        }))
                      }
                    >
                      {EVENT_KIND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Tiêu đề (VI)">
                  <input
                    className={inputClass}
                    value={draft.titleVi || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, titleVi: e.target.value }))}
                  />
                </Field>
                <Field label="Nhãn loại trên card" hint="Để trống → dùng nhãn từ bộ kit">
                  <input
                    className={inputClass}
                    value={draft.typeLabelVi || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, typeLabelVi: e.target.value }))}
                  />
                </Field>
                <Field label="Phụ đề (VI)">
                  <input
                    className={inputClass}
                    value={draft.subtitleVi || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, subtitleVi: e.target.value }))}
                  />
                </Field>
                <Field label="Mô tả">
                  <textarea
                    className={`${inputClass} min-h-[5rem]`}
                    value={draft.descriptionVi || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, descriptionVi: e.target.value }))}
                  />
                </Field>
                <Field label="Mẹo quan sát">
                  <textarea
                    className={`${inputClass} min-h-[4rem]`}
                    value={draft.observationTipsVi || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, observationTipsVi: e.target.value }))}
                  />
                </Field>
                <Field label="Khả năng quan sát">
                  <input
                    className={inputClass}
                    value={draft.visibilityLabelVi || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, visibilityLabelVi: e.target.value }))}
                  />
                </Field>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
                  <p className="text-sm font-semibold text-white">Liên kết hành động</p>
                  <Field
                    label="Bài học Learning Path"
                    hint="Hiện nút «Bài học» trên card — phù hợp sự kiện Giáo dục (vd. Trăng non)"
                  >
                    <select
                      className={inputClass}
                      value={lessonPicker}
                      onChange={(e) => {
                        const href = e.target.value
                        setLessonPicker(href)
                        setDraft((d) => ({
                          ...d,
                          lessonHref: href || null,
                          eventKind: href && !d.exploreTarget ? 'educational' : d.eventKind,
                        }))
                      }}
                    >
                      <option value="">— Không gắn bài —</option>
                      {lessonOptions.map((opt) => (
                        <option key={opt.href} value={opt.href}>
                          {opt.titleVi} · {opt.moduleId}/{opt.nodeId}
                        </option>
                      ))}
                    </select>
                    <input
                      className={`${inputClass} mt-2`}
                      placeholder="/tutorial/module/node/lesson-id"
                      value={draft.lessonHref || ''}
                      onChange={(e) => {
                        const href = e.target.value.trim()
                        setLessonPicker(href)
                        setDraft((d) => ({ ...d, lessonHref: href || null }))
                      }}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="La bàn Explore" hint="sky = bầu trời, solar = hệ Mặt Trời">
                      <select
                        className={inputClass}
                        value={draft.exploreView || ''}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            exploreView: (e.target.value || null) as AstronomyEventAdmin['exploreView'],
                          }))
                        }
                      >
                        <option value="">Không mở La bàn</option>
                        <option value="sky">Sky (bầu trời)</option>
                        <option value="solar">Solar (Mặt Trời / Mặt Trăng)</option>
                      </select>
                    </Field>
                    <Field label="Mục tiêu Explore" hint="planet-moon, planet-sun, gemini…">
                      <input
                        className={inputClass}
                        list="explore-targets"
                        value={draft.exploreTarget || ''}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, exploreTarget: e.target.value.trim() || null }))
                        }
                      />
                      <datalist id="explore-targets">
                        {EXPLORE_TARGET_SUGGESTIONS.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </Field>
                  </div>

                  <Field label="Quiz (tuỳ chọn)" hint="URL quiz ôn / concept quiz">
                    <input
                      className={inputClass}
                      value={draft.quizHref || ''}
                      onChange={(e) => setDraft((d) => ({ ...d, quizHref: e.target.value.trim() || null }))}
                    />
                  </Field>

                  {(draft.eventKind || 'observable') === 'observable' ? (
                    <Field label="Gem check-in (override)" hint="Để trống = 20 gem mặc định khi quan sát">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        className={inputClass}
                        value={draft.gemRewardOverride ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          setDraft((d) => ({
                            ...d,
                            gemRewardOverride: raw === '' ? null : Number(raw),
                          }))
                        }}
                      />
                    </Field>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveEvent()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/25 py-3 text-sm font-semibold text-sky-50 ring-1 ring-sky-400/30 transition hover:bg-sky-500/35 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isCreating ? 'Tạo sự kiện' : 'Lưu thay đổi'}
                </button>
              </>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-sm text-slate-500">
                <CalendarPlus className="mb-3 h-8 w-8 text-slate-600" />
                Chọn sự kiện bên trái hoặc bấm &quot;Tạo sự kiện&quot;
              </div>
            )}
          </StudioPanel>

          <StudioPanel accent={activeKit?.accentColor || '#38bdf8'} className="p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Eye className="h-4 w-4" />
              Xem trước card lịch
            </p>
            {(selected || isCreating) && draft.titleVi ? (
              <AstronomyEventCard event={previewEvent} showEngagement={false} />
            ) : (
              <p className="text-sm text-slate-500">Preview hiển thị khi bạn nhập tiêu đề.</p>
            )}
          </StudioPanel>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <StudioPanel className="space-y-2 p-3">
            <p className="px-2 pb-1 text-xs uppercase tracking-wider text-slate-500">Loại sự kiện</p>
            {EVENT_TYPES.map((type) => {
              const kit = kitMap[type]
              const accent = kit?.accentColor || '#64748b'
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedKitType(type)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    selectedKitType === type
                      ? 'border-white/20 bg-white/[0.06]'
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10"
                    style={{ background: `color-mix(in srgb, ${accent} 22%, transparent)` }}
                  >
                    <EventTypeIcon type={type} iconKey={kit?.iconKey} accent={accent} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{TYPE_META[type].labelVi}</p>
                    <p className="text-[10px] text-slate-500">{kit?.legendLabelVi || type}</p>
                  </div>
                </button>
              )
            })}
          </StudioPanel>

          <StudioPanel accent={String(kitDraft.accentColor || '#38bdf8')} className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Palette className="h-4 w-4 text-sky-300" />
              Thiết kế bộ kit · {TYPE_META[selectedKitType].labelVi}
            </div>

            <Field label="Icon hiển thị trên lịch">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
                {KIT_ICON_OPTIONS.map(({ key, labelVi, Icon }) => {
                  const active = kitDraft.iconKey === key
                  const accent = kitDraft.accentColor || '#38bdf8'
                  return (
                    <button
                      key={key}
                      type="button"
                      title={labelVi}
                      onClick={() => setKitDraft((d) => ({ ...d, iconKey: key }))}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
                        active ? 'ring-2' : 'border-white/10 hover:border-white/20'
                      }`}
                      style={
                        active
                          ? {
                              borderColor: accent,
                              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                              boxShadow: `0 0 0 1px ${accent}`,
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-5 w-5" style={{ color: accent }} />
                      <span className="text-[9px] text-slate-400">{labelVi}</span>
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Màu accent (card & icon)">
              <div className="mb-2 flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={hex}
                    onClick={() => setKitDraft((d) => ({ ...d, accentColor: hex }))}
                    className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-[#06091a] transition ${
                      kitDraft.accentColor === hex ? 'ring-white' : 'ring-transparent hover:ring-white/30'
                    }`}
                    style={{ background: hex }}
                  />
                ))}
              </div>
              <input
                className={inputClass}
                value={kitDraft.accentColor || ''}
                onChange={(e) => setKitDraft((d) => ({ ...d, accentColor: e.target.value }))}
                placeholder="#fbbf24"
              />
            </Field>

            <Field label="Nhãn loại mặc định (VI)">
              <input
                className={inputClass}
                value={kitDraft.typeLabelVi || ''}
                onChange={(e) => setKitDraft((d) => ({ ...d, typeLabelVi: e.target.value }))}
              />
            </Field>
            <Field label="Nhãn legend (bộ lọc lịch)">
              <input
                className={inputClass}
                value={kitDraft.legendLabelVi || ''}
                onChange={(e) => setKitDraft((d) => ({ ...d, legendLabelVi: e.target.value }))}
              />
            </Field>
            <Field label="Khả năng quan sát mặc định">
              <input
                className={inputClass}
                value={kitDraft.defaultVisibilityLabelVi || ''}
                onChange={(e) => setKitDraft((d) => ({ ...d, defaultVisibilityLabelVi: e.target.value }))}
              />
            </Field>
            <Field label="Mẹo quan sát mặc định">
              <textarea
                className={`${inputClass} min-h-[4rem]`}
                value={kitDraft.defaultObservationTipsVi || ''}
                onChange={(e) => setKitDraft((d) => ({ ...d, defaultObservationTipsVi: e.target.value }))}
              />
            </Field>
            <Field label="Gợi ý biên tập mô tả">
              <textarea
                className={`${inputClass} min-h-[3rem]`}
                value={kitDraft.descriptionHintVi || ''}
                onChange={(e) => setKitDraft((d) => ({ ...d, descriptionHintVi: e.target.value }))}
              />
            </Field>

            <button
              type="button"
              disabled={busy}
              onClick={() => void saveKit()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/5 disabled:opacity-50"
              style={{
                background: `color-mix(in srgb, ${kitDraft.accentColor || '#38bdf8'} 20%, transparent)`,
              }}
            >
              <Save className="h-4 w-4" />
              Lưu bộ thiết kế
            </button>
          </StudioPanel>

          <StudioPanel accent={String(kitDraft.accentColor || '#38bdf8')} className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Preview trên lịch</p>
            <AstronomyEventCard event={kitPreviewEvent} showEngagement={false} />
          </StudioPanel>
        </div>
      )}
    </div>
  )
}
