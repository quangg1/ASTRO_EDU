'use client'

/**
 * Select — token-styled wrapper around native `<select>`.
 *
 * Pragmatic scope: a custom dropdown (with keyboard search, virtualization,
 * portal positioning) is significant work and there are zero callers asking
 * for it today. Native `<select>` already gives:
 *   • free keyboard nav, type-to-search, mobile-native pickers
 *   • screen-reader announcements
 *   • zero JS overhead
 *
 * We just give it the same chrome as Input so forms read consistently.
 *
 *   <Select value={role} onChange={(e) => setRole(e.target.value)}>
 *     <option value="student">Student</option>
 *     <option value="teacher">Teacher</option>
 *   </Select>
 */

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'block w-full rounded-ds-control border bg-ds-surface text-sm text-ds-text',
        'px-[var(--density-pad-x)] py-[var(--density-pad-y)]',
        'transition-colors duration-ds-fast ease-ds',
        'focus:outline-none focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid
          ? 'border-ds-danger-strong focus:border-ds-danger'
          : 'border-ds-border focus:border-ds-accent-strong',
        // Native arrow stays — adding a custom caret would require absolute
        // positioning + matching colors per surface; not worth it.
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})
