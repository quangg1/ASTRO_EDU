'use client'

import { useCallback, useState } from 'react'
import type { LessonSection } from '@/features/courses/api/coursesApi'

/** Giữ key cũ — LP clipboard tương thích localStorage */
export const STUDIO_BLOCK_CLIPBOARD_KEY = 'lp_studio_block_clipboard_v1'

export function cloneLessonSection<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

type Options = {
  /** Mặc định bật — Course + LP paste qua localStorage */
  persistToStorage?: boolean
  storageKey?: string
}

function readStorage(key: string): LessonSection | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as LessonSection
  } catch {
    return null
  }
}

function writeStorage(key: string, section: LessonSection) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(section))
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Reorder / duplicate / delete / copy-paste blocks — dùng chung Course + LP studio.
 */
export function useBlockEditorActions(
  sections: LessonSection[],
  onSectionsChange: (next: LessonSection[]) => void,
  options: Options = {},
) {
  const storageKey = options.storageKey ?? STUDIO_BLOCK_CLIPBOARD_KEY
  const persist = options.persistToStorage !== false
  const [internalClipboard, setInternalClipboard] = useState<LessonSection | null>(null)

  const readClipboard = useCallback((): LessonSection | null => {
    if (internalClipboard) return internalClipboard
    if (persist) return readStorage(storageKey)
    return null
  }, [internalClipboard, persist, storageKey])

  const writeClipboard = useCallback(
    (section: LessonSection) => {
      setInternalClipboard(section)
      if (persist) writeStorage(storageKey, section)
    },
    [persist, storageKey],
  )

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= sections.length || from === to) return
      const next = [...sections]
      const [picked] = next.splice(from, 1)
      next.splice(to, 0, picked)
      onSectionsChange(next)
      return to
    },
    [sections, onSectionsChange],
  )

  const moveUp = useCallback((index: number) => move(index, index - 1), [move])
  const moveDown = useCallback((index: number) => move(index, index + 1), [move])

  const duplicateAt = useCallback(
    (index: number, insertAfter = true) => {
      if (index < 0 || index >= sections.length) return
      const next = [...sections]
      const insertIndex = insertAfter ? index + 1 : index
      next.splice(insertIndex, 0, cloneLessonSection(sections[index]))
      onSectionsChange(next)
      return insertIndex
    },
    [sections, onSectionsChange],
  )

  const removeAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return
      const next = [...sections]
      next.splice(index, 1)
      onSectionsChange(next)
    },
    [sections, onSectionsChange],
  )

  const updateAt = useCallback(
    (index: number, updated: LessonSection) => {
      if (index < 0 || index >= sections.length) return
      const next = [...sections]
      next[index] = updated
      onSectionsChange(next)
    },
    [sections, onSectionsChange],
  )

  const copyAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return null
      const copied = cloneLessonSection(sections[index])
      writeClipboard(copied)
      return copied
    },
    [sections, writeClipboard],
  )

  const pasteAfter = useCallback(
    (afterIndex: number | null = null) => {
      const source = readClipboard()
      if (!source) return null
      const next = [...sections]
      const insertAt =
        afterIndex == null ? next.length : Math.min(next.length, Math.max(0, afterIndex + 1))
      next.splice(insertAt, 0, cloneLessonSection(source))
      onSectionsChange(next)
      return insertAt
    },
    [sections, onSectionsChange, readClipboard],
  )

  const append = useCallback(
    (section: LessonSection) => {
      onSectionsChange([...sections, section])
    },
    [sections, onSectionsChange],
  )

  return {
    moveUp,
    moveDown,
    duplicateAt,
    removeAt,
    updateAt,
    copyAt,
    pasteAfter,
    append,
    hasClipboard: Boolean(readClipboard()),
    readClipboard,
  }
}
