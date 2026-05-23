import type { ReactNode } from 'react'

/**
 * Edu surface wrapper for `/courses/*` (catalog, course landing, lesson
 * player). Same surface tokens as `/tutorial/*` so the two consumer flows
 * share one visual language.
 */
export default function CoursesLayout({ children }: { children: ReactNode }) {
  return <div className="surface-edu">{children}</div>
}
