'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTutorContextStore } from '@/features/courses/public'
import { useAuthStore } from '@/features/auth/public'
import { getAiChatUrl } from '@/lib/aiChatUrl'
import {
  AgentChips,
  buildSessionContext,
  useAgentPageContext,
} from '@/features/agent/public'
import { inferSessionContextFromPath } from '@/features/agent/lib/inferSessionContextFromPath'
import { useAgentPageContextStore } from '@/features/agent/stores/useAgentPageContextStore'
import { useCosmoAssistantChat } from '@/features/agent/hooks/useCosmoAssistantChat'
import type { OpenCosmoAssistantDetail } from '@/features/agent/lib/openCosmoAssistant'
import type { SessionContext } from '@/features/agent/types'
import { SearchParamsSuspense } from '@/components/layout/SearchParamsSuspense'
import { AssistantMarkdown } from './AssistantMarkdown'

function routeLabel(pathname: string): string | undefined {
  if (!pathname || pathname === '/') return 'Trang chủ'
  if (pathname.startsWith('/courses/')) return 'Trang khóa học'
  if (pathname.startsWith('/courses')) return 'Danh sách khóa học'
  if (pathname.startsWith('/explore')) return 'Khám phá'
  if (pathname.startsWith('/tutorial/')) return 'Bài học lộ trình'
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/my-courses')) return 'Khóa học của tôi'
  if (pathname.startsWith('/studio')) return 'Studio'
  return undefined
}

function contextTag(sessionContext: SessionContext): string | null {
  if (sessionContext.surface === 'learning_path' && sessionContext.lessonTitle) {
    return `🤖 Đang trợ lý cho bài: ${sessionContext.lessonTitle}`
  }
  if (sessionContext.surface === 'explore') {
    if (sessionContext.planet === 'earth' && sessionContext.stageTimeMa != null) {
      return `🤖 Khám phá · Trái Đất ${sessionContext.stageTimeMa} Ma`
    }
    return '🤖 Khám phá · ngữ cảnh hiện tại'
  }
  if (sessionContext.surface === 'course' && sessionContext.lessonTitle) {
    return `🤖 Khóa học · ${sessionContext.lessonTitle}`
  }
  return null
}

function CosmoAssistantInner() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const pageAgentReact = useAgentPageContext()
  const pageAgentStore = useAgentPageContextStore((s) => s.pageContext)
  const pageAgent = pageAgentStore ?? pageAgentReact
  const { mode, course, requestAgentOpen, setRequestAgentOpen } = useTutorContextStore()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const [mounted, setMounted] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [guestMessages, setGuestMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([])
  const [guestInput, setGuestInput] = useState('')
  const [guestError, setGuestError] = useState<string | null>(null)
  const [attachmentImage, setAttachmentImage] = useState<{ base64: string; type: string } | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCourseMode = mode === 'course' && course
  const sessionContext = useMemo(() => {
    if (pageAgent?.sessionContext) return pageAgent.sessionContext
    const inferred = inferSessionContextFromPath(pathname || '')
    if (inferred) return inferred
    return buildSessionContext({
      pathname: pathname || '/',
      surface: isCourseMode ? 'course' : 'general',
      courseSlug: course?.courseSlug,
      routeLabel: routeLabel(pathname || '/'),
    })
  }, [pageAgent?.sessionContext, pathname, isCourseMode, course?.courseSlug])

  const chat = useCosmoAssistantChat({
    sessionContext,
    learnerSnapshot: pageAgent?.learnerSnapshot,
    onSuggestDepth: pageAgent?.onSuggestDepth,
  })

  const tag = contextTag(sessionContext)
  const isContextual = chat.isContextual
  const canUseAI = !!user
  const messages = canUseAI ? chat.messages : guestMessages
  const input = canUseAI ? chat.input : guestInput
  const setInput = canUseAI ? chat.setInput : setGuestInput
  const loading = canUseAI ? chat.loading : guestLoading
  const error = canUseAI ? chat.error : guestError

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (requestAgentOpen) {
      setOpen(true)
      setRequestAgentOpen(false)
    }
  }, [requestAgentOpen, setRequestAgentOpen])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenCosmoAssistantDetail>).detail
      setOpen(true)
      if (detail?.prompt) {
        if (user) chat.setInput(detail.prompt)
        else setGuestInput(detail.prompt)
      }
    }
    window.addEventListener('galaxies:agent-open', onOpen)
    return () => window.removeEventListener('galaxies:agent-open', onOpen)
  }, [user, chat.setInput])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const onDragStart = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      setPos({
        x: dragStart.current.px + (e.clientX - dragStart.current.x),
        y: dragStart.current.py + (e.clientY - dragStart.current.y),
      })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  const closePanel = useCallback(() => setOpen(false), [])

  const applyImageFromFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      const base64 = match ? match[2] : dataUrl
      const type = file.type || 'image/jpeg'
      setAttachmentImage({ base64, type })
    }
    reader.readAsDataURL(file)
  }, [])

  const onAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    applyImageFromFile(file)
    e.target.value = ''
  }

  const handlePasteImage = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const cd = e.clipboardData
    if (!cd) return
    for (let i = 0; i < cd.items.length; i++) {
      const item = cd.items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          applyImageFromFile(file)
          return
        }
      }
    }
  }

  const sendGuest = async () => {
    const text = guestInput.trim()
    if (!text || guestLoading) return
    setGuestInput('')
    setGuestError(null)
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: text }
    const next = [...guestMessages, userMsg]
    setGuestMessages(next)
    setGuestLoading(true)
    try {
      const res = await fetch(getAiChatUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          context: 'general',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGuestError(typeof data.error === 'string' ? data.error : 'Lỗi kết nối')
        return
      }
      setGuestMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', content: data.message?.content ?? '' },
      ])
    } catch {
      setGuestError('Trợ lý AI tạm thời không khả dụng.')
    } finally {
      setGuestLoading(false)
    }
  }

  const handleSend = () => {
    if (!canUseAI) {
      void sendGuest()
      return
    }
    const snap = attachmentImage
      ? { base64: attachmentImage.base64, mediaType: attachmentImage.type }
      : undefined
    if (snap) setAttachmentImage(null)
    void chat.send(chat.input, { image: snap })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const panelHeight = isContextual
    ? 'h-[min(480px,52vh)]'
    : 'h-[min(560px,calc(100vh-8rem))]'

  const fab = (
    <div className="cosmo-assistant-portal pointer-events-none fixed inset-0 z-[1001]">
      <button
        type="button"
        data-ai-tutor-fab
        data-cosmo-assistant-fab
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black pointer-events-auto',
          canUseAI ? 'hover:scale-110' : 'opacity-90 hover:opacity-100',
        )}
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          boxShadow: '0 4px 24px rgba(6, 182, 212, 0.45)',
        }}
        title={tag ?? 'CosmoLearn AI — trợ lý học tập'}
        aria-label="Mở CosmoLearn AI"
      >
        <span className="text-2xl" aria-hidden>
          ✨
        </span>
      </button>

      {open && (
        <div
          data-ai-tutor-panel
          data-cosmo-assistant-panel
          className={clsx(
            'fixed flex flex-col overflow-hidden rounded-2xl animate-slide-up-fade pointer-events-auto',
            panelHeight,
            'w-[min(380px,calc(100vw-2rem))]',
          )}
          style={{
            bottom: `${96 - pos.y}px`,
            right: `${24 - pos.x}px`,
            background:
              'linear-gradient(180deg, rgba(10, 25, 47, 0.97) 0%, rgba(6, 22, 42, 0.98) 100%)',
            boxShadow: '0 0 0 1px rgba(6, 182, 212, 0.25), 0 24px 48px rgba(0,0,0,0.5)',
          }}
          role="dialog"
          aria-label="CosmoLearn AI"
        >
          <div
            className="flex shrink-0 cursor-grab items-center justify-between border-b border-cyan-400/20 px-4 py-3 active:cursor-grabbing select-none"
            onMouseDown={onDragStart}
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  ✨
                </span>
                <span className="font-semibold text-cyan-300">CosmoLearn AI</span>
              </div>
              {tag ? (
                <p className="mt-1 truncate text-[11px] text-cyan-100/85">{tag}</p>
              ) : (
                <p className="mt-0.5 text-[11px] text-gray-500">Chế độ tổng quan</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {!canUseAI && (
              <div className="px-2 py-8 text-center">
                <p className="mb-2 text-sm text-gray-300">Đăng nhập để dùng CosmoLearn AI và lưu hội thoại.</p>
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname || '/')}`}
                  className="inline-block rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
                >
                  Đăng nhập
                </Link>
              </div>
            )}

            {canUseAI && chat.depthBanner && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <p>{chat.depthBanner.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-amber-500/25 px-2 py-1 hover:bg-amber-500/40"
                    onClick={() => {
                      void chat.postDepthPreference(chat.depthBanner!.depth)
                      chat.onSuggestDepth?.(chat.depthBanner!.depth, chat.depthBanner!.reason)
                      chat.setDepthBanner(null)
                    }}
                  >
                    Chuyển sang {chat.depthBanner.depth}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-amber-200/70 hover:text-amber-100"
                    onClick={() => chat.setDepthBanner(null)}
                  >
                    Giữ mức hiện tại
                  </button>
                </div>
              </div>
            )}

            {canUseAI && sessionContext.surface === 'learning_path' && sessionContext.lessonTitle && (
              <button
                type="button"
                onClick={() => chat.explainActiveSection()}
                className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-left text-xs text-cyan-100 hover:bg-cyan-500/20"
              >
                {sessionContext.activeSectionTitle
                  ? `📖 Giải thích mục đang đọc: “${sessionContext.activeSectionTitle}”`
                  : `📖 Giải thích bài “${sessionContext.lessonTitle}”`}
              </button>
            )}

            {canUseAI && messages.length === 0 && !loading && (
              <p className="text-xs text-gray-400">
                {sessionContext.coachTrigger === 'quiz_failed'
                  ? 'Bạn vừa chưa đạt quiz ôn — hỏi theo hướng gợi mở.'
                  : isContextual
                    ? 'Hỏi về nội dung đang xem — trợ lý đã nạp ngữ cảnh trang này.'
                    : 'Chào bạn! Hỏi về Trái Đất, hóa thạch, thiên văn hoặc nhờ mở Khám phá.'}
              </p>
            )}

            {messages.map((m) => {
              const assistantActions =
                m.role === 'assistant' &&
                'actions' in m &&
                Array.isArray(m.actions) &&
                m.actions.length > 0
                  ? m.actions
                  : null
              return (
              <div key={m.id} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[90%] rounded-2xl text-sm',
                    m.role === 'user'
                      ? 'border border-cyan-400/30 bg-cyan-500/25 px-3 py-2.5 text-cyan-50'
                      : 'border border-white/10 bg-white/5 px-4 py-3 text-gray-100',
                  )}
                >
                  {m.role === 'assistant' ? (
                    <AssistantMarkdown
                      source={
                        m.content ||
                        ('streaming' in m && (m as { streaming?: boolean }).streaming ? '…' : '')
                      }
                    />
                  ) : (
                    <>
                      {m.role === 'user' &&
                        'imageAttachment' in m &&
                        m.imageAttachment &&
                        typeof m.imageAttachment === 'object' &&
                        'mediaType' in m.imageAttachment &&
                        'base64' in m.imageAttachment && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-white/15 bg-black/25">
                            <img
                              src={`data:${String(m.imageAttachment.mediaType)};base64,${String(m.imageAttachment.base64)}`}
                              alt=""
                              className="max-h-40 w-full object-contain"
                            />
                          </div>
                        )}
                      {m.content}
                    </>
                  )}
                  {assistantActions ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assistantActions.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-500/35"
                          onClick={() => chat.runAction(a, closePanel)}
                        >
                          {a.type === 'go_to_explore'
                            ? `Khám phá ${a.stageTime} Ma`
                            : a.type === 'open_lesson'
                              ? `Mở bài: ${a.lessonSlug}`
                              : a.type}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )})}

            {loading && <p className="animate-pulse text-xs text-gray-500">Đang suy nghĩ…</p>}
            {error && <p className="text-xs text-red-300">{error}</p>}
            <div ref={listEndRef} />
          </div>

          {canUseAI && chat.relatedLessons.length > 0 && (
            <AgentChips
              chips={chat.relatedLessons.map((l) => ({
                label: l.title,
                action: 'open_lp_lesson',
                lessonId: l.lessonId,
                moduleId: l.moduleId,
                nodeId: l.nodeId,
              }))}
              onChip={(c) => {
                chat.navigateLpLesson(c, closePanel)
              }}
              className="px-4 pb-2"
            />
          )}

          {canUseAI && (messages.length === 0 || chat.fallbackChips.length > 0) && (
            <AgentChips
              chips={
                chat.fallbackChips.length > 0
                  ? chat.fallbackChips
                  : chat.defaultSuggestions.map((s) => ({ label: s, action: 'prompt' }))
              }
              onChip={(c) => {
                if (c.action === 'prompt') chat.setInput(c.label)
                else chat.handleChip(c)
              }}
              className="px-4 pb-2"
            />
          )}

          <div className="shrink-0 border-t border-cyan-400/15 p-3">
            {canUseAI && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAttachImage}
                aria-label="Đính kèm ảnh"
              />
            )}
            {canUseAI && attachmentImage && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5 pr-2">
                <img
                  src={`data:${attachmentImage.type};base64,${attachmentImage.base64}`}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                />
                <span className="flex-1 truncate text-xs text-gray-400">Ảnh đính kèm</span>
                <button
                  type="button"
                  onClick={() => setAttachmentImage(null)}
                  className="shrink-0 px-1 text-lg leading-none text-gray-400 hover:text-white"
                  aria-label="Bỏ ảnh"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-cyan-400/20 bg-black/30 focus-within:border-cyan-400/40">
              {canUseAI && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Đính kèm ảnh"
                  disabled={loading}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={canUseAI ? handlePasteImage : undefined}
                rows={2}
                placeholder={
                  canUseAI
                    ? attachmentImage
                      ? 'Hỏi về ảnh này…'
                      : 'Hỏi CosmoLearn AI…'
                    : 'Đăng nhập để chat đầy đủ'
                }
                className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || (!input.trim() && !attachmentImage)}
                className="m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
                aria-label="Gửi"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(fab, document.body)
}

export function CosmoAssistantWidget() {
  return (
    <SearchParamsSuspense fallback={null}>
      <CosmoAssistantInner />
    </SearchParamsSuspense>
  )
}
