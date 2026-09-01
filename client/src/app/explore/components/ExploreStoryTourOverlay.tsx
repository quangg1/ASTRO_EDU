'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, X } from 'lucide-react'
import {
  useShowcaseStore,
  DEFAULT_STORY_WAYPOINT_SEC,
  type ShowcaseStoryCampaign,
  type ShowcaseStoryWaypoint,
  resolveStoryTourCameraForWaypoint,
  type ShowcaseOrbitEntity,
} from '@/features/content3d/showcase/public'

type Props = {
  story: ShowcaseStoryCampaign
  orbitEntities?: ShowcaseOrbitEntity[]
  onClose: () => void
  onFocusEntity: (entityId: string) => void
  onFinished?: () => void
}

function resolveWaypointEntityId(waypoint: ShowcaseStoryWaypoint): string | null {
  const entityId = String(waypoint.entityId || '').trim()
  if (entityId) return entityId
  const planet = String(waypoint.focusPlanetName || '').trim()
  if (planet) return `planet-${planet.toLowerCase()}`
  return null
}

export function ExploreStoryTourOverlay({
  story,
  orbitEntities = [],
  onClose,
  onFocusEntity,
  onFinished,
}: Props) {
  const waypoints = story.waypoints ?? []
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const orbitById = useRef(new Map<string, ShowcaseOrbitEntity>())
  orbitById.current = new Map(orbitEntities.map((e) => [String(e.id || '').trim(), e] as const))

  const applyWaypoint = useCallback(
    (index: number) => {
      const wp = waypoints[index]
      if (!wp) return
      const entityId = resolveWaypointEntityId(wp)
      if (!entityId) return
      const stepKey = `${story.id}:${index}:${entityId}`
      useShowcaseStore.getState().setStoryTourStepKey(stepKey)
      const orbitEntity = orbitById.current.get(entityId)
      const camera = resolveStoryTourCameraForWaypoint(wp, entityId, orbitEntity)
      if (camera) {
        useShowcaseStore.getState().setStoryTourCameraFrame({
          entityId,
          stepKey,
          distance: camera.distance,
          az: camera.az,
          el: camera.el,
        })
      } else {
        useShowcaseStore.getState().setStoryTourCameraFrame(null)
      }
      onFocusEntity(entityId)
    },
    [onFocusEntity, story.id, waypoints],
  )

  useEffect(() => {
    const ids = waypoints
      .map((wp) => resolveWaypointEntityId(wp))
      .filter((id): id is string => Boolean(id))
    useShowcaseStore.getState().setStoryTourActive(true)
    useShowcaseStore.getState().setStoryTourAllowOrbitIds(ids)
    applyWaypoint(0)
    return () => {
      useShowcaseStore.getState().setStoryTourActive(false)
      useShowcaseStore.getState().setStoryTourCameraFrame(null)
      useShowcaseStore.getState().setStoryTourStepKey('')
      useShowcaseStore.getState().setStoryTourAllowOrbitIds([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset tour khi đổi campaign
  }, [story.id])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const goToStep = useCallback(
    (next: number) => {
      clearTimer()
      if (next >= waypoints.length) {
        onFinished?.()
        onClose()
        return
      }
      if (next < 0) return
      setStepIndex(next)
      applyWaypoint(next)
    },
    [applyWaypoint, clearTimer, onClose, onFinished, waypoints.length],
  )

  useEffect(() => {
    clearTimer()
    if (!playing || waypoints.length === 0) return
    const durationSec = waypoints[stepIndex]?.durationSec ?? DEFAULT_STORY_WAYPOINT_SEC
    timerRef.current = setTimeout(() => {
      goToStep(stepIndex + 1)
    }, durationSec * 1000)
    return clearTimer
  }, [playing, stepIndex, waypoints, goToStep, clearTimer])

  const current = waypoints[stepIndex]
  const progress = waypoints.length > 0 ? ((stepIndex + 1) / waypoints.length) * 100 : 0

  if (!current || waypoints.length === 0) {
    return (
      <div className="pointer-events-auto fixed inset-x-0 bottom-6 z-[30] mx-auto max-w-xl px-4">
        <div className="rounded-2xl border border-white/10 bg-black/80 p-4 text-center text-sm text-white/70 backdrop-blur-md">
          Story chưa có kịch bản waypoint.
          <button type="button" onClick={onClose} className="ml-2 text-ds-accent underline">
            Đóng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[30] px-4 pb-6 pt-16"
      data-explore-tour="explore-story-tour"
    >
      <div className="pointer-events-auto mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/[0.12] bg-[rgba(6,8,14,0.92)] shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        <div className="h-1 bg-white/[0.06]">
          <div
            className="h-full bg-ds-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-start gap-3 px-5 pb-4 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ds-accent">
              <Sparkles className="h-3 w-3" strokeWidth={1.75} />
              Story tour · {story.title}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-white/88">{current.captionVi}</p>
            <p className="mt-2 text-[10px] text-white/35">
              Bước {stepIndex + 1}/{waypoints.length} · {story.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Thoát story tour"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
          <button
            type="button"
            disabled={stepIndex <= 0}
            onClick={() => goToStep(stepIndex - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/70 transition hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Trước
          </button>
          <div className="flex items-center gap-1.5">
            {waypoints.map((_, i) => (
              <span
                key={`${story.id}-dot-${i}`}
                className={clsx(
                  'h-1.5 w-1.5 rounded-full transition',
                  i === stepIndex ? 'bg-ds-accent scale-125' : i < stepIndex ? 'bg-white/40' : 'bg-white/15',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/70 transition hover:bg-white/10"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Tạm dừng' : 'Tiếp tục'}
            </button>
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-ds-accent-strong bg-ds-accent-soft px-3 py-1.5 text-[11px] font-medium text-ds-accent transition hover:brightness-110"
            >
              {stepIndex >= waypoints.length - 1 ? 'Kết thúc' : 'Tiếp'}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
