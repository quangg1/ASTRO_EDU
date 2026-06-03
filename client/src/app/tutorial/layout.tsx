import type { ReactNode } from 'react'

/**
 * Edu surface wrapper for the entire `/tutorial/*` tree (Learning Path,
 * module / node / lesson views, knowledge map). Sets cyan accent + comfortable
 * density via `surface-edu` CSS variables so any descendant primitive that
 * reads `var(--color-accent)` & friends renders consistently.
 */
export default function TutorialLayout({ children }: { children: ReactNode }) {
  return (
    <div className="surface-edu relative z-10 text-ds-text w-full relative">
      {children}
    </div>
  )
}
