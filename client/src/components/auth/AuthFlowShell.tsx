'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { getStaticAssetUrl } from '@/lib/apiConfig'
import { SiteLogo } from '@/components/ui/SiteLogo'
import { sr } from '@/lib/ssrStableRandom'

export function AuthFloatingParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: sr(i * 7 + 1) * 100,
    y: sr(i * 7 + 2) * 100,
    size: sr(i * 7 + 3) * 3 + 1,
    duration: sr(i * 7 + 4) * 20 + 10,
    delay: sr(i * 7 + 5) * 5,
    driftX: sr(i * 7 + 6) * 20 - 10,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/30"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -30, 0], x: [0, p.driftX, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export function AuthStarfield() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: `${sr(i + 1000) * 100}%`,
            left: `${sr(i + 2000) * 100}%`,
            width: sr(i + 3000) * 3 + 1,
            height: sr(i + 4000) * 3 + 1,
          }}
          animate={{ opacity: [0.1, 1, 0.1], scale: [1, 1.5, 1] }}
          transition={{
            duration: sr(i + 5000) * 3 + 2,
            repeat: Infinity,
            delay: sr(i + 6000) * 2,
          }}
        />
      ))}
    </div>
  )
}

export function AuthHudPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative flex flex-col gap-7 sm:gap-8 px-6 py-8 sm:px-10 sm:py-12 ${className}`}
      style={{
        background: 'var(--color-panel-muted)',
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 80px rgba(126,231,255,0.04)',
        clipPath:
          'polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px)',
      }}
    >
      <span aria-hidden className="absolute top-2 left-2 w-[18px] h-[18px]" style={{ borderTop: '1px solid var(--color-accent)', borderLeft: '1px solid var(--color-accent)' }} />
      <span aria-hidden className="absolute top-2 right-2 w-[18px] h-[18px]" style={{ borderTop: '1px solid var(--color-accent)', borderRight: '1px solid var(--color-accent)' }} />
      <span aria-hidden className="absolute bottom-2 left-2 w-[18px] h-[18px]" style={{ borderBottom: '1px solid var(--color-accent)', borderLeft: '1px solid var(--color-accent)' }} />
      <span aria-hidden className="absolute bottom-2 right-2 w-[18px] h-[18px]" style={{ borderBottom: '1px solid var(--color-accent)', borderRight: '1px solid var(--color-accent)' }} />
      {children}
    </div>
  )
}

export function AuthEyebrow({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span aria-hidden className="block w-8 h-px bg-ds-accent/60" />
      <span className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.22em] text-ds-subtle">
        {label}
      </span>
    </div>
  )
}

export function AuthOrDivider() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-[var(--color-accent-soft)]" />
      <span className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.28em] text-ds-subtle">
        HOẶC
      </span>
      <div className="flex-1 h-px bg-[var(--color-accent-soft)]" />
    </div>
  )
}

export function AuthSplitLayout({
  hero,
  children,
  topRight,
}: {
  hero: ReactNode
  children: ReactNode
  topRight?: ReactNode
}) {
  return (
    <div className="relative min-h-screen flex">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <img src={getStaticAssetUrl('/images/nebula-home.jpg')} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <AuthFloatingParticles />
        <div className="relative z-10 flex flex-col gap-6 p-16 justify-center w-full">{hero}</div>
      </motion.div>

      <div className="w-full lg:w-1/2 relative overflow-y-auto">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(900px 600px at 85% -10%, rgba(245,165,36,0.10), transparent 60%), radial-gradient(700px 500px at 10% 30%, rgba(126,231,255,0.06), transparent 60%), var(--color-bg-base)',
          }}
        />
        <AuthStarfield />
        <AuthFloatingParticles />
        {topRight}
        <div className="lg:hidden absolute top-6 left-4 z-20">
          <SiteLogo className="text-xl" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-full max-w-[568px] pt-16 sm:pt-0"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function AuthSingleColumnLayout({ children, topRight }: { children: ReactNode; topRight?: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-y-auto">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(900px 600px at 85% -10%, rgba(245,165,36,0.10), transparent 60%), radial-gradient(700px 500px at 10% 30%, rgba(126,231,255,0.06), transparent 60%), var(--color-bg-base)',
        }}
      />
      <AuthStarfield />
      <AuthFloatingParticles />
      {topRight}
      <div className="relative z-10 flex items-start justify-center min-h-screen p-4 sm:p-8 py-10 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[568px] pt-12 sm:pt-4"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

export function AuthProgressBar({ step, total, label }: { step: number; total: number; label: string }) {
  const pct = ((step + 1) / total) * 100
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-[11px] font-[JetBrains_Mono,monospace] uppercase tracking-[0.18em] text-ds-subtle mb-2">
        <span>
          Bước {step + 1} / {total}
        </span>
        <span className="text-ds-accent">{label}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(126,231,255,0.08)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: step === total - 1 ? 'linear-gradient(90deg, var(--color-accent), var(--color-brand-amber))' : 'var(--color-accent)',
          }}
        />
      </div>
    </div>
  )
}

export function AuthAlert({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  const styles =
    tone === 'error'
      ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fecaca' }
      : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', color: '#a7f3d0' }
  return (
    <div
      className="px-4 py-3 text-sm"
      style={{
        ...styles,
        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
      }}
    >
      {children}
    </div>
  )
}

export function AuthPrimaryButton({
  children,
  disabled,
  type = 'button',
  onClick,
  variant = 'amber',
  showArrow = true,
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  variant?: 'amber' | 'cyan'
  showArrow?: boolean
}) {
  const isAmber = variant === 'amber'
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{
        y: disabled ? 0 : -1,
        boxShadow: disabled
          ? 'none'
          : isAmber
            ? '0 0 0 1px rgba(245,165,36,0.6), 0 16px 44px -10px rgba(245,165,36,0.7)'
            : '0 0 0 1px var(--color-accent-strong), 0 16px 44px -10px rgba(126,231,255,0.35)',
      }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className="relative inline-flex items-center justify-center gap-2 w-full px-7 py-[18px] mt-1 font-[Space_Grotesk,sans-serif] text-[15px] uppercase tracking-[0.16em] transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      style={{
        background: isAmber
          ? 'linear-gradient(180deg, #ffd27a, var(--color-brand-amber) 60%, #d8901c)'
          : 'linear-gradient(180deg, #a8f0ff, var(--color-accent) 60%, #5bc4e0)',
        color: isAmber ? '#1a0e00' : '#031018',
        fontWeight: 600,
        boxShadow: isAmber
          ? '0 0 0 1px rgba(245,165,36,0.5), 0 12px 36px -10px rgba(245,165,36,0.55)'
          : '0 0 0 1px rgba(126,231,255,0.4), 0 12px 36px -10px rgba(126,231,255,0.35)',
        clipPath:
          'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
      }}
    >
      <span className="relative z-10">{children}</span>
      {showArrow ? (
        <span className="relative z-10 font-[JetBrains_Mono,monospace] text-[14px]" aria-hidden>
          →
        </span>
      ) : null}
    </motion.button>
  )
}

export const authInputClass =
  'flex-1 bg-transparent border-0 outline-none font-[Space_Grotesk,sans-serif] text-[14px] text-ds-text placeholder:text-ds-subtle'

export function AuthTextField({
  label,
  icon: Icon,
  children,
  trailing,
}: {
  label: string
  icon: LucideIcon
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="font-[JetBrains_Mono,monospace] text-[11px] uppercase tracking-[0.2em] text-white">
          {label}
        </label>
        {trailing}
      </div>
      <div
        className="input-row flex items-center gap-3 px-4 h-[52px] focus-within:!border-ds-accent transition-all"
        style={{
          background: 'var(--color-panel-glass)',
          border: '1px solid var(--color-border)',
          clipPath:
            'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        }}
      >
        <Icon className="size-[15px] text-ds-subtle shrink-0" strokeWidth={1.6} aria-hidden />
        {children}
      </div>
    </div>
  )
}
