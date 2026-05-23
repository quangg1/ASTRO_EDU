import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

type FieldState = { invalid?: boolean }

const FIELD_BASE =
  'block w-full rounded-ds-control border bg-ds-surface text-sm text-ds-text ' +
  'placeholder:text-ds-subtle px-[var(--density-pad-x)] py-[var(--density-pad-y)] ' +
  'transition-colors duration-ds-fast ease-ds ' +
  'focus:outline-none focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

const fieldClass = (invalid?: boolean) =>
  cn(
    FIELD_BASE,
    invalid
      ? 'border-ds-danger-strong focus:border-ds-danger'
      : 'border-ds-border focus:border-ds-accent-strong',
  )

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldState

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(fieldClass(invalid), className)}
      {...props}
    />
  )
})

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldState

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(fieldClass(invalid), 'resize-y', className)}
        {...props}
      />
    )
  },
)
