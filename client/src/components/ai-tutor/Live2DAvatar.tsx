'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import clsx from 'clsx'
import { loadCubismCore } from '@/lib/live2d/loadCubismCore'
import {
  AGENT_REPLY_MOTION,
  AGENT_THINKING_MOTION,
  pickAgentMotion,
  type AgentMotion,
} from '@/lib/live2d/agentMotionPlan'
import { NITO_IDLE_MOTION, getNitoModelLoadCandidates } from '@/lib/live2d/nitoConfig'

export type Live2DAvatarHandle = {
  onUserMessage: (text: string) => void
  onThinking: () => void
  onAssistantReply: () => void
  onWelcome: () => void
}

type Props = {
  onClick?: () => void
  className?: string
  width?: number
  height?: number
  title?: string
  /** center = hero empty state; dock = peeking at input */
  align?: 'center' | 'dock'
  interactive?: boolean
}

type Live2DModelInstance = {
  motion: (group: string, index?: number) => Promise<boolean>
  focus: (x: number, y: number) => void
  destroy: (options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void
  scale: { set: (v: number) => void }
  anchor: { set: (x: number, y: number) => void }
  x: number
  y: number
  getBounds: () => { width: number; height: number; x: number; y: number }
}

function fitModelInStage(
  model: Live2DModelInstance,
  stageW: number,
  stageH: number,
  align: 'center' | 'dock',
) {
  model.scale.set(1)
  model.anchor.set(0.5, 1)
  const bounds = model.getBounds()
  const pad = align === 'center' ? 0.94 : 0.9
  let fitScale =
    bounds.width > 0 && bounds.height > 0
      ? Math.min(stageW / bounds.width, stageH / bounds.height) * pad
      : Math.min(stageW / 900, stageH / 1200) * pad
  const capW = align === 'center' ? 320 : 400
  const capH = align === 'center' ? 420 : 520
  fitScale = Math.min(fitScale, stageW / capW, stageH / capH)
  model.scale.set(fitScale)
  model.x = align === 'center' ? stageW / 2 : stageW * 0.52
  model.y = stageH
}

export const Live2DAvatar = forwardRef<Live2DAvatarHandle, Props>(function Live2DAvatar(
  {
    onClick,
    className,
    width = 136,
    height = 172,
    title = 'Mở CosmoLearn AI',
    align = 'dock',
    interactive = true,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<Live2DModelInstance | null>(null)
  const turnRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const playMotion = (motion: AgentMotion) => {
    const model = modelRef.current
    if (!model) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    void model.motion(motion.group, motion.index).then((ok) => {
      if (!ok) void model.motion(motion.group)
    })
    idleTimerRef.current = setTimeout(() => {
      void model.motion(NITO_IDLE_MOTION.group, NITO_IDLE_MOTION.index)
    }, 4200)
  }

  useImperativeHandle(ref, () => ({
    onUserMessage(text: string) {
      const motion = pickAgentMotion(text, turnRef.current)
      turnRef.current += 1
      playMotion(motion)
    },
    onThinking() {
      playMotion(AGENT_THINKING_MOTION)
    },
    onAssistantReply() {
      playMotion(AGENT_REPLY_MOTION)
    },
    onWelcome() {
      playMotion({ group: 'FlickLeft', index: 0 })
    },
  }))

  useEffect(() => {
    let cancelled = false
    let app: { destroy: (removeView?: boolean, stageOptions?: boolean) => void; stage: { addChild: (c: unknown) => void } } | null =
      null

    async function init() {
      const host = hostRef.current
      if (!host) return

      try {
        await loadCubismCore()
        if (cancelled) return

        const PIXI = await import('pixi.js')
        const { Live2DModel } = await import('pixi-live2d-display/cubism4')
        Live2DModel.registerTicker(PIXI.Ticker)

        if (cancelled) return

        let model: Live2DModelInstance | null = null
        for (const url of getNitoModelLoadCandidates()) {
          try {
            model = (await Live2DModel.from(url, { autoInteract: false })) as Live2DModelInstance
            break
          } catch {
            /* try next candidate (CDN → local) */
          }
        }
        if (!model) {
          setFailed(true)
          return
        }

        app = new PIXI.Application({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
          autoDensity: true,
        })

        const canvas = app.view as HTMLCanvasElement
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.display = 'block'
        host.appendChild(canvas)
        canvas.style.touchAction = 'none'

        if (cancelled) {
          model.destroy()
          app.destroy(true, { children: true })
          return
        }

        app.stage.addChild(model)
        fitModelInStage(model, width, height, align)
        modelRef.current = model
        void model.motion(NITO_IDLE_MOTION.group, NITO_IDLE_MOTION.index)
        setReady(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void init()

    return () => {
      cancelled = true
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      modelRef.current?.destroy({ children: true, texture: true, baseTexture: true })
      modelRef.current = null
      app?.destroy(true, { children: true })
      app = null
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [width, height, align])

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const model = modelRef.current
    const host = hostRef.current
    if (!model || !host) return
    const rect = host.getBoundingClientRect()
    model.focus(e.clientX - rect.left, e.clientY - rect.top)
  }

  if (failed) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className={clsx(
          'flex items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400',
          className,
        )}
        style={{
          width,
          height: Math.min(height, width),
          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
          boxShadow: '0 4px 24px rgba(6, 182, 212, 0.45)',
        }}
      >
        <span className="text-2xl" aria-hidden>
          ✨
        </span>
      </button>
    )
  }

  const shellProps = interactive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        },
      }
    : { 'aria-hidden': true as const }

  return (
    <div
      {...shellProps}
      title={interactive ? title : undefined}
      aria-label={interactive ? title : undefined}
      onMouseMove={handleMouseMove}
      className={clsx(
        interactive && 'cursor-pointer hover:scale-[1.02]',
        'select-none overflow-hidden rounded-xl transition-transform focus:outline-none focus:ring-2 focus:ring-cyan-400/70',
        !ready && 'animate-pulse bg-cyan-950/30',
        className,
      )}
      style={{ width, height }}
    >
      <div ref={hostRef} className="h-full w-full" />
    </div>
  )
})
