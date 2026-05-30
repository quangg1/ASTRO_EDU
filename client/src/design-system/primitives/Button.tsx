import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-ds-accent-soft text-ds-accent border-ds-accent-strong hover:bg-ds-accent-strong hover:text-ds-accent-fg',
  secondary:
    'bg-ds-surface text-ds-text border-ds-border hover:bg-ds-elevated hover:border-ds-border-strong',
  ghost:
    'bg-transparent text-ds-muted border-transparent hover:bg-ds-surface hover:text-ds-text',
  danger:
    'bg-ds-danger-soft text-ds-danger border-ds-danger-strong hover:bg-ds-danger-strong hover:text-white',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2.5',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-ds-control border font-medium',
        'transition-colors duration-ds-fast ease-ds',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
})
