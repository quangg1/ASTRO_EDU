'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { fetchAgentSessions } from '../api/agentApi'
import type { AgentSessionSummary } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  onSelectSession: (sessionId: string) => void | Promise<void>
  onNewChat: () => void
  activeSessionId?: string
}

type TimeGroup = 'today' | 'yesterday' | 'week' | 'older'

const GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  week: 'Tuần này',
  older: 'Trước đó',
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function timeGroupFor(date: Date): TimeGroup {
  const now = startOfDay(new Date())
  const day = startOfDay(date)
  const diffDays = Math.round((now.getTime() - day.getTime()) / 86400000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'week'
  return 'older'
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hôm qua'
  if (days < 7) return `${days} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })
}

function contextIcon(label: string): string {
  if (/khám phá/i.test(label)) return '🪐'
  if (/lộ trình|bài/i.test(label)) return '📖'
  if (/khóa học/i.test(label)) return '🎓'
  return '✨'
}

function HistorySkeleton() {
  return (
    <div className="space-y-3 px-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.03] p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="mb-2 h-3 w-2/3 rounded bg-white/10" />
          <div className="mb-3 h-2 w-full rounded bg-white/5" />
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-cyan-500/10" />
            <div className="h-5 w-20 rounded-full bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SessionCard({
  item,
  active,
  loading,
  onSelect,
}: {
  item: AgentSessionSummary
  active: boolean
  loading: boolean
  onSelect: () => void
}) {
  const updated = parseDate(item.updatedAt) || parseDate(item.createdAt)
  const relative = updated ? formatRelativeTime(updated) : ''

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={clsx(
        'group relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60',
        active
          ? 'border-cyan-400/45 bg-gradient-to-br from-cyan-500/20 via-cyan-900/10 to-transparent shadow-[0_0_24px_rgba(6,182,212,0.12)]'
          : 'border-white/8 bg-white/[0.03] hover:border-cyan-400/30 hover:opacity-90/[0.06] hover:shadow-[0_8px_28px_rgba(0,0,0,0.25)]',
        loading && 'pointer-events-none opacity-60',
      )}
    >
      <div
        className={clsx(
          'pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full transition-opacity',
          active ? 'bg-cyan-400 opacity-100' : 'bg-cyan-400/70 opacity-0 group-hover:opacity-100',
        )}
      />
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-base shadow-inner"
          aria-hidden
        >
          {contextIcon(item.contextLabel)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 text-sm font-medium text-white">{item.title}</p>
            <span className="shrink-0 text-[10px] text-ds-subtle">{relative}</span>
          </div>
          {item.preview ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ds-muted">{item.preview}</p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-ds-text/90">
              {item.contextLabel}
            </span>
            {item.messageCount > 0 ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ds-muted">
                {item.messageCount} lượt
              </span>
            ) : null}
          </div>
        </div>
        <svg
          className="mt-1 h-4 w-4 shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-ds-text/80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

export function CosmoChatHistoryPanel({
  open,
  onClose,
  onSelectSession,
  onNewChat,
  activeSessionId,
}: Props) {
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const rows = await fetchAgentSessions(24)
      setSessions(rows)
    } catch {
      setListError('Không tải được lịch sử. Thử lại sau.')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadSessions()
  }, [open, loadSessions])

  const grouped = useMemo(() => {
    const buckets: Record<TimeGroup, AgentSessionSummary[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    }
    for (const item of sessions) {
      const d = parseDate(item.updatedAt) || parseDate(item.createdAt)
      const group = d ? timeGroupFor(d) : 'older'
      buckets[group].push(item)
    }
    return (Object.keys(GROUP_LABELS) as TimeGroup[]).filter((g) => buckets[g].length > 0).map((g) => ({
      key: g,
      label: GROUP_LABELS[g],
      items: buckets[g],
    }))
  }, [sessions])

  const handleSelect = async (sessionId: string) => {
    setLoadingSessionId(sessionId)
    try {
      await onSelectSession(sessionId)
      onClose()
    } finally {
      setLoadingSessionId(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[rgba(6,18,36,0.98)] backdrop-blur-md animate-slide-up-fade"
      role="region"
      aria-label="Lịch sử chat CosmoLearn AI"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-cyan-400/15 px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ds-muted transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Quay lại chat"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ds-text">Lịch sử chat</h2>
          <p className="text-[11px] text-ds-subtle">Các cuộc trò chuyện đã lưu trên tài khoản</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onNewChat()
            onClose()
          }}
          className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-medium text-ds-text transition-colors hover:opacity-90/25"
        >
          + Mới
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingList ? (
          <HistorySkeleton />
        ) : listError ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <p className="text-sm text-red-300">{listError}</p>
            <button
              type="button"
              onClick={() => void loadSessions()}
              className="mt-4 rounded-full border border-ds-border px-4 py-2 text-xs text-gray-300 hover:bg-white/5"
            >
              Thử lại
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/20 to-transparent text-2xl shadow-[0_0_32px_rgba(6,182,212,0.15)]">
              💬
            </div>
            <p className="text-sm font-medium text-white">Chưa có cuộc trò chuyện nào</p>
            <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-ds-subtle">
              Hỏi nito bất cứ điều gì — mỗi lượt chat sẽ được lưu để bạn mở lại sau.
            </p>
            <button
              type="button"
              onClick={() => {
                onNewChat()
                onClose()
              }}
              className="mt-6 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
            >
              Bắt đầu chat
            </button>
          </div>
        ) : (
          <div className="space-y-5 px-3 py-3 pb-6">
            {grouped.map((group) => (
              <section key={group.key}>
                <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ds-accent/55">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <SessionCard
                      key={item.sessionId}
                      item={item}
                      active={item.sessionId === activeSessionId}
                      loading={loadingSessionId === item.sessionId}
                      onSelect={() => void handleSelect(item.sessionId)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
