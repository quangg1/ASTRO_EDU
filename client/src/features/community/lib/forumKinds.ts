import type { Forum } from '@/features/community/api/communityApi'

export const NEWS_FORUM_SLUG = 'tin-thien-van'

export function isNewsForum(forum: Pick<Forum, 'slug' | 'isNews'> | null | undefined): boolean {
  if (!forum) return false
  return Boolean(forum.isNews) || forum.slug === NEWS_FORUM_SLUG
}

export const DISCUSSION_FORUM_SLUGS = [
  'hoi-dap-hoc-tap',
  'thao-luan-thien-van',
  'quan-sat-thiet-bi',
  'du-an-showcase',
  'phan-hoi-ung-dung',
] as const

export const DEFAULT_COURSE_QUESTION_FORUM = 'hoi-dap-hoc-tap'

export function composeForumUrl(
  slug: string,
  params?: Record<string, string | undefined | null>,
): string {
  const q = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const s = String(v ?? '').trim()
      if (s) q.set(k, s)
    }
  }
  const qs = q.toString()
  return `/community/${slug}${qs ? `?${qs}` : ''}`
}
