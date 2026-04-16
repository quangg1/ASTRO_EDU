import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/40 hover:bg-cyan-500/30',
  secondary: 'bg-white/5 text-white border-white/10 hover:bg-white/10',
  ghost: 'bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:text-white',
}

export function Button({
  className,
  variant = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
}
