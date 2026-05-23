'use client'

/**
 * Tabs — controlled tab list with keyboard navigation.
 *
 * Three pieces, parent-driven (controlled). State lives in the consumer so
 * URL syncing / persistence stays explicit:
 *   <Tabs value={tab} onValueChange={setTab}>
 *     <TabList aria-label="Admin sections">
 *       <Tab value="users">Users</Tab>
 *       <Tab value="content">Content</Tab>
 *     </TabList>
 *     <TabPanel value="users" current={tab}>…</TabPanel>
 *     <TabPanel value="content" current={tab}>…</TabPanel>
 *   </Tabs>
 *
 * Keyboard: ← → moves focus and selects the next/prev enabled tab. Home/End
 * jump to first/last. Active tab gets `aria-selected="true"` + accent underline.
 * Token-driven: accent follows surface (Edu cyan / Studio teal / Scene planet).
 */

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

type TabsCtx = {
  baseId: string
  value: string
  onValueChange: (next: string) => void
}
const Ctx = createContext<TabsCtx | null>(null)
const useTabs = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('Tabs.* must be used inside <Tabs>')
  return c
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (next: string) => void
  children: ReactNode
  className?: string
}) {
  const baseId = useId()
  return (
    <Ctx.Provider value={{ baseId, value, onValueChange }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  )
}

export type TabProps = {
  value: string
  disabled?: boolean
  children: ReactNode
  className?: string
}

export function Tab({ value, disabled, children, className }: TabProps) {
  const { baseId, value: current, onValueChange } = useTabs()
  const active = value === current
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={active}
      aria-disabled={disabled || undefined}
      tabIndex={active ? 0 : -1}
      data-tab-value={value}
      data-disabled={disabled || undefined}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={cn(
        'relative px-3 py-2 text-sm font-medium transition-colors',
        'border-b-2 -mb-px',
        active
          ? 'border-ds-accent text-ds-text'
          : 'border-transparent text-ds-muted hover:text-ds-text',
        disabled && 'opacity-50 cursor-not-allowed hover:text-ds-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-strong rounded-sm',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabList({
  children,
  className,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  className?: string
  'aria-label': string
}) {
  const { onValueChange } = useTabs()
  const listRef = useRef<HTMLDivElement | null>(null)

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
      const list = listRef.current
      if (!list) return
      const tabs = Array.from(
        list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([data-disabled])'),
      )
      if (tabs.length === 0) return
      const focused = document.activeElement as HTMLElement | null
      const idx = focused ? tabs.indexOf(focused as HTMLButtonElement) : -1
      let nextIdx = idx
      if (e.key === 'ArrowRight') nextIdx = idx < 0 ? 0 : (idx + 1) % tabs.length
      else if (e.key === 'ArrowLeft') nextIdx = idx <= 0 ? tabs.length - 1 : idx - 1
      else if (e.key === 'Home') nextIdx = 0
      else if (e.key === 'End') nextIdx = tabs.length - 1
      e.preventDefault()
      const target = tabs[nextIdx]
      target?.focus()
      const v = target?.getAttribute('data-tab-value')
      if (v) onValueChange(v)
    },
    [onValueChange],
  )

  // Forward `aria-label` and disable propagation when no children are valid tabs.
  const validChildren = Children.toArray(children).filter((c) =>
    isValidElement(c),
  ) as ReactElement[]

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-center gap-1 border-b border-ds-border overflow-x-auto',
        className,
      )}
    >
      {validChildren.map((child, i) => cloneElement(child, { key: child.key ?? i }))}
    </div>
  )
}

export function TabPanel({
  value,
  current,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  value: string
  current: string
}) {
  const { baseId } = useTabs()
  const active = value === current
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!active}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
      {...props}
    >
      {active ? children : null}
    </div>
  )
}
