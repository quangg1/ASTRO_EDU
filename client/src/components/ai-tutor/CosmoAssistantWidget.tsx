'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
import { CosmoChatHistoryPanel } from '@/features/agent/ui/CosmoChatHistoryPanel'
import type { OpenCosmoAssistantDetail } from '@/features/agent/lib/openCosmoAssistant'
import type { SessionContext } from '@/features/agent/types'
import { isAgentQuizLocked } from '@/features/agent/lib/agentQuizLock'
import { SearchParamsSuspense } from '@/components/layout/SearchParamsSuspense'
import { AssistantMarkdown } from './AssistantMarkdown'
import type { Live2DAvatarHandle } from './Live2DAvatar'
import { NITO_DOCK_RAIL_WIDTH, NITO_SIZE } from '@/lib/live2d/nitoConfig'

const Live2DAvatar = dynamic(() => import('./Live2DAvatar').then((m) => m.Live2DAvatar), {
  ssr: false,
})

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
  const router = useRouter()
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
  const [historyOpen, setHistoryOpen] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<Live2DAvatarHandle>(null)
  const prevLoadingRef = useRef(false)
  const prevMessageCountRef = useRef(0)

  const isCourseMode = mode === 'course' && course
  const sessionContext = useMemo(() => {
    if (pageAgent?.sessionContext) return pageAgent.sessionContext
    const inferred = inferSessionContextFromPath(pathname || '')
    if (inferred) return inferred
    const path = pathname || '/'
    if (path.startsWith('/studio')) {
      const inferredStudio = inferSessionContextFromPath(path)
      if (inferredStudio) return inferredStudio
    }
    return buildSessionContext({
      pathname: path,
      surface: isCourseMode ? 'course' : 'general',
      courseSlug: course?.courseSlug,
      routeLabel: routeLabel(path),
    })
  }, [pageAgent?.sessionContext, pathname, isCourseMode, course?.courseSlug])

  const chat = useCosmoAssistantChat({
    sessionContext,
    learnerSnapshot: pageAgent?.learnerSnapshot,
    onSuggestDepth: pageAgent?.onSuggestDepth,
  })

  const tag = contextTag(sessionContext)
  const quizLocked = isAgentQuizLocked(sessionContext)
  const isContextual = chat.isContextual
  const canUseAI = !!user && !quizLocked
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
    if (quizLocked && open) setOpen(false)
  }, [quizLocked, open])

  useEffect(() => {
    const onOpen = (e: Event) => {
      if (isAgentQuizLocked(sessionContext)) return
      const detail = (e as CustomEvent<OpenCosmoAssistantDetail>).detail
      setOpen(true)
      if (detail?.prompt) {
        if (user) chat.setInput(detail.prompt)
        else setGuestInput(detail.prompt)
      }
    }
    window.addEventListener('galaxies:agent-open', onOpen)
    return () => window.removeEventListener('galaxies:agent-open', onOpen)
  }, [user, chat.setInput, sessionContext])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (loading && !prevLoadingRef.current) {
      avatarRef.current?.onThinking()
    }
    prevLoadingRef.current = loading
  }, [loading])

  useEffect(() => {
    const count = messages.length
    if (count > prevMessageCountRef.current) {
      const last = messages[count - 1]
      if (last?.role === 'assistant') {
        avatarRef.current?.onAssistantReply()
      }
    }
    prevMessageCountRef.current = count
  }, [messages])

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

  const closePanel = useCallback(() => {
    setOpen(false)
    setHistoryOpen(false)
  }, [])

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
    avatarRef.current?.onUserMessage(text)
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
    const text = chat.input.trim()
    if (!text && !attachmentImage) return
    if (text) avatarRef.current?.onUserMessage(text)
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

  const isEmptyChat = messages.length === 0 && !loading
  const showHero = open && isEmptyChat
  const showDock = open && !isEmptyChat

  const welcomeMessage = useMemo(() => {
    if (!canUseAI) {
      return 'Mình là nito — trợ lý CosmoLearn AI. Đăng nhập để hỏi bài và lưu hội thoại nhé!'
    }
    if (sessionContext.coachTrigger === 'quiz_failed') {
      return 'Bạn vừa chưa đạt quiz ôn — hỏi mình theo hướng gợi mở, mình sẽ giúp!'
    }
    if (isContextual) {
      return 'Hỏi mình về nội dung đang xem — mình đã nạp ngữ cảnh trang này rồi!'
    }
    return 'Chào bạn! Hỏi về Trái Đất, hóa thạch, thiên văn hoặc nhờ mở Khám phá.'
  }, [canUseAI, sessionContext.coachTrigger, isContextual])

  const promptChips =
    chat.fallbackChips.length > 0
      ? chat.fallbackChips
      : chat.defaultSuggestions.map((s) => ({ label: s, action: 'prompt' as const }))

  useEffect(() => {
    if (!showHero) return
    const t = window.setTimeout(() => avatarRef.current?.onWelcome(), 500)
    return () => window.clearTimeout(t)
  }, [showHero])

  const panelHeight = isContextual
    ? 'h-[min(480px,52vh)]'
    : 'h-[min(560px,calc(100vh-8rem))]'

  const panelShellClass =
    'flex w-full flex-col overflow-hidden rounded-2xl animate-slide-up-fade pointer-events-auto shrink-0'

  const inputBar = (
    <div className="relative z-10 shrink-0 border-t border-cyan-400/15 bg-[rgba(6,22,42,0.98)] p-3">
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
          className="m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cyan-400 transition-all hover:bg-cyan-400/15 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Gửi"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )

  const fab = quizLocked ? null : (
    <div className="cosmo-assistant-portal pointer-events-none fixed inset-0 z-[1001]">
      <div
        className={clsx(
          'pointer-events-auto fixed z-[1002] flex flex-col items-end',
          'right-0 pr-[env(safe-area-inset-right,0px)]',
          'bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-[env(safe-area-inset-bottom,0px)]',
        )}
        data-ai-tutor-fab
        data-cosmo-assistant-fab
      >
        {!open && (
          <Live2DAvatar
            ref={avatarRef}
            onClick={() => setOpen(true)}
            width={NITO_SIZE.peek.width}
            height={NITO_SIZE.peek.height}
            align="dock"
            title={tag ?? 'Mở CosmoLearn AI'}
            className="drop-shadow-[0_8px_32px_rgba(6,182,212,0.35)]"
          />
        )}

        {open && (
          <div
            data-ai-tutor-panel
            data-cosmo-assistant-panel
            className={clsx(panelShellClass, panelHeight, 'relative')}
            style={{
              width: 'min(440px, calc(100vw - 12px - env(safe-area-inset-right, 0px)))',
              minHeight: isContextual ? 'min(360px, 48vh)' : 'min(420px, 55vh)',
              maxHeight:
                'min(560px, calc(100vh - 5rem - env(safe-area-inset-bottom, 0px)))',
              transform: pos.x || pos.y ? `translate(${-pos.x}px, ${-pos.y}px)` : undefined,
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
                <span className="text-sm font-semibold text-cyan-300">CosmoLearn AI</span>
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] text-cyan-200/80">
                  nito
                </span>
              </div>
              {tag ? (
                <p className="mt-1 truncate text-[11px] text-cyan-100/85">{tag}</p>
              ) : (
                <p className="mt-0.5 text-[11px] text-gray-500">Chế độ tổng quan</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canUseAI && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-cyan-200"
                  aria-label="Lịch sử chat"
                  title="Lịch sử chat"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
          </div>

          {canUseAI && (
            <CosmoChatHistoryPanel
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              activeSessionId={chat.sessionId}
              onNewChat={() => chat.startNewConversation()}
              onSelectSession={async (sessionId) => {
                const ok = await chat.loadHistorySession(sessionId)
                if (!ok) chat.setError('Không mở được cuộc trò chuyện này.')
              }}
            />
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {showHero ? (
              <>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="flex min-h-full flex-col items-center justify-start px-4 pb-6 pt-5">
                  <Live2DAvatar
                    ref={avatarRef}
                    width={NITO_SIZE.hero.width}
                    height={NITO_SIZE.hero.height}
                    align="center"
                    interactive={false}
                    className="drop-shadow-[0_12px_40px_rgba(6,182,212,0.25)] shrink-0"
                  />
                  <div
                    className="relative mt-4 w-full max-w-[92%] rounded-2xl rounded-bl-sm border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-cyan-900/10 px-4 py-3 text-center text-sm leading-relaxed text-cyan-50/95 shadow-[0_0_24px_rgba(6,182,212,0.12)]"
                    role="status"
                  >
                    <span className="absolute -top-2 left-8 h-3 w-3 rotate-45 border-l border-t border-cyan-400/30 bg-cyan-500/15" />
                    {welcomeMessage}
                  </div>

                  {!canUseAI && (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(pathname || '/')}`}
                      className="mt-4 inline-block rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
                    >
                      Đăng nhập
                    </Link>
                  )}

                  {canUseAI && sessionContext.surface === 'learning_path' && sessionContext.lessonTitle && (
                    <button
                      type="button"
                      onClick={() => chat.explainActiveSection()}
                      className="mt-4 w-full max-w-[92%] rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2.5 text-left text-xs text-cyan-100 hover:bg-cyan-500/20"
                    >
                      {sessionContext.activeSectionTitle
                        ? `📖 Giải thích mục đang đọc: “${sessionContext.activeSectionTitle}”`
                        : `📖 Giải thích bài “${sessionContext.lessonTitle}”`}
                    </button>
                  )}

                  {canUseAI && promptChips.length > 0 && (
                    <AgentChips
                      variant="prominent"
                      chips={promptChips}
                      onChip={(c) => {
                        if (c.action === 'prompt') chat.setInput(c.label)
                        else chat.handleChip(c)
                      }}
                      className="mt-5 px-1"
                    />
                  )}
                </div>
              </div>
                {inputBar}
              </>
            ) : (
              <div className="flex min-h-0 flex-1 overflow-hidden">
                {showDock && (
                  <aside
                    className="relative z-0 flex shrink-0 flex-col items-center justify-end overflow-hidden border-r border-cyan-400/15 bg-gradient-to-b from-cyan-950/40 to-transparent pb-2 pt-2"
                    style={{ width: NITO_DOCK_RAIL_WIDTH }}
                    aria-hidden
                  >
                    <Live2DAvatar
                      ref={avatarRef}
                      width={NITO_SIZE.dock.width}
                      height={NITO_SIZE.dock.height}
                      align="center"
                      interactive={false}
                      className="shrink-0 drop-shadow-[0_8px_24px_rgba(6,182,212,0.3)]"
                    />
                  </aside>
                )}
                <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="space-y-3 p-3 sm:p-4">
                {!canUseAI && (
                  <div className="px-2 py-6 text-center">
                    <p className="mb-2 text-sm text-gray-300">
                      Đăng nhập để dùng CosmoLearn AI và lưu hội thoại.
                    </p>
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

                {canUseAI &&
                  sessionContext.surface === 'learning_path' &&
                  sessionContext.lessonTitle &&
                  !showHero && (
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
                            : a.type === 'focus_showcase_entity'
                              ? `Xem ${a.entityName || a.entityId.replace(/^planet-|^moon-|^sc-/, '').replace(/-/g, ' ')}`
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

                      {loading &&
                        !messages.some(
                          (m) =>
                            m.role === 'assistant' &&
                            'streaming' in m &&
                            (m as { streaming?: boolean }).streaming &&
                            m.content.length > 0,
                        ) && (
                          <p className="animate-pulse text-xs text-gray-500">Đang suy nghĩ…</p>
                        )}
                      {error && <p className="text-xs text-red-300">{error}</p>}
                      <div ref={listEndRef} />
                    </div>
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
                      className="px-3 pb-2 sm:px-4"
                    />
                  )}

                  {canUseAI && chat.communityThreads.length > 0 && (
                    <AgentChips
                      chips={chat.communityThreads.map((t) => ({
                        label: t.title.length > 42 ? `${t.title.slice(0, 42)}…` : t.title,
                        action: 'community_thread',
                        href: t.href,
                      }))}
                      onChip={(c) => {
                        if (c.href) {
                          router.push(c.href)
                          closePanel()
                        }
                      }}
                      className="px-3 pb-2 sm:px-4"
                    />
                  )}

                  {canUseAI && messages.length > 0 && chat.fallbackChips.length > 0 && (
                    <AgentChips
                      chips={chat.fallbackChips}
                      onChip={(c) => {
                        if (c.action === 'prompt') chat.setInput(c.label)
                        else chat.handleChip(c)
                      }}
                      className="px-3 pb-2 sm:px-4"
                    />
                  )}
                  {inputBar}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  if (!fab) return null
  return createPortal(fab, document.body)
}

export function CosmoAssistantWidget() {
  return (
    <SearchParamsSuspense fallback={null}>
      <CosmoAssistantInner />
    </SearchParamsSuspense>
  )
}
