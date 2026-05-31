'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchSavedItems,
  notifySavedItemsChanged,
  savedItemKeyForCourse,
  savedItemKeyForLp,
  toggleSavedItem,
  removeSavedItem,
  SAVED_ITEMS_CHANGED_EVENT,
  type SavedItem,
  type SavedItemSource,
  type ToggleSavedPayload,
} from '@/features/saved/api/savedApi'

export function useSavedItems(source?: SavedItemSource) {
  const { user, checked } = useAuthStore()
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const list = await fetchSavedItems(source)
      setItems(list)
    } finally {
      setLoading(false)
    }
  }, [user?.id, source])

  useEffect(() => {
    if (!checked) return
    void refresh()
  }, [checked, refresh])

  useEffect(() => {
    const onChange = () => { void refresh() }
    window.addEventListener(SAVED_ITEMS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(SAVED_ITEMS_CHANGED_EVENT, onChange)
  }, [refresh])

  const itemKeySet = useMemo(() => new Set(items.map((i) => i.itemKey)), [items])
  const lpLessonIdSet = useMemo(
    () => new Set(items.filter((i) => i.source === 'learning-path').map((i) => i.lessonId).filter(Boolean) as string[]),
    [items],
  )

  const isSaved = useCallback(
    (key: string) => itemKeySet.has(key),
    [itemKeySet],
  )

  const isLpLessonSaved = useCallback(
    (lessonId: string) => lpLessonIdSet.has(lessonId) || itemKeySet.has(savedItemKeyForLp(lessonId)),
    [itemKeySet, lpLessonIdSet],
  )

  const isCourseLessonSaved = useCallback(
    (courseSlug: string, lessonSlug: string) =>
      itemKeySet.has(savedItemKeyForCourse(courseSlug, lessonSlug)),
    [itemKeySet],
  )

  const toggle = useCallback(
    async (payload: ToggleSavedPayload) => {
      if (!user?.id) return { saved: false, error: 'login_required' as const }
      const key =
        payload.source === 'learning-path'
          ? savedItemKeyForLp(payload.lessonId)
          : savedItemKeyForCourse(payload.courseSlug, payload.lessonSlug)
      const res = await toggleSavedItem(payload)
      setItems((prev) => {
        if (res.saved && res.item) return [res.item, ...prev.filter((i) => i.itemKey !== key)]
        return prev.filter((i) => i.itemKey !== key)
      })
      notifySavedItemsChanged()
      return res
    },
    [user?.id],
  )

  const remove = useCallback(
    async (itemKey: string) => {
      const ok = await removeSavedItem(itemKey)
      if (ok) notifySavedItemsChanged()
      return ok
    },
    [],
  )

  return {
    items,
    loading,
    refresh,
    isSaved,
    isLpLessonSaved,
    isCourseLessonSaved,
    toggle,
    remove,
    loggedIn: Boolean(user?.id),
  }
}
