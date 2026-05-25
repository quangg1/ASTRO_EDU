import type { Post } from '@/features/community/api/communityApi'

export type PathSource = 'course' | 'learning-path'

/** Query params when opening compose from a lesson or course. */
export type ComposeLearningContext = {
  pathSource: PathSource
  courseSlug?: string
  courseId?: string
  courseTitle?: string
  lessonSlug?: string
  lessonTitle?: string
  learningModuleId?: string
  learningNodeId?: string
  learningLessonId?: string
  moduleTitle?: string
  nodeTitle?: string
}

function pick(sp: URLSearchParams, key: string): string | undefined {
  const v = sp.get(key)?.trim()
  return v || undefined
}

export function parseComposeContext(searchParams: URLSearchParams): ComposeLearningContext | null {
  const pathSource = pick(searchParams, 'pathSource') as PathSource | undefined
  const courseSlug = pick(searchParams, 'courseSlug')
  const learningLessonId = pick(searchParams, 'learningLessonId')

  if (!pathSource && !courseSlug && !learningLessonId) return null

  const resolved: PathSource =
    pathSource === 'learning-path' || (!pathSource && learningLessonId && !courseSlug)
      ? 'learning-path'
      : 'course'

  return {
    pathSource: resolved,
    courseSlug,
    courseId: pick(searchParams, 'courseId'),
    courseTitle: pick(searchParams, 'courseTitle'),
    lessonSlug: pick(searchParams, 'lessonSlug'),
    lessonTitle: pick(searchParams, 'lessonTitle'),
    learningModuleId: pick(searchParams, 'learningModuleId'),
    learningNodeId: pick(searchParams, 'learningNodeId'),
    learningLessonId,
    moduleTitle: pick(searchParams, 'moduleTitle'),
    nodeTitle: pick(searchParams, 'nodeTitle'),
  }
}

export function buildContextTitle(ctx: ComposeLearningContext): string {
  if (ctx.pathSource === 'learning-path') {
    const parts = [ctx.moduleTitle, ctx.nodeTitle, ctx.lessonTitle].filter(Boolean)
    return parts.join(' · ') || 'Lộ trình học'
  }
  if (ctx.lessonTitle && ctx.courseTitle) return `${ctx.courseTitle} · ${ctx.lessonTitle}`
  if (ctx.courseTitle) return ctx.courseTitle
  if (ctx.lessonTitle) return ctx.lessonTitle
  if (ctx.courseSlug) return ctx.courseSlug
  return 'Khóa học'
}

export function suggestPostTitle(ctx: ComposeLearningContext): string {
  const focus = ctx.lessonTitle || ctx.courseTitle || ctx.moduleTitle
  if (focus) return `Hỏi: ${focus}`
  return ''
}

export function composeContextToParams(
  ctx: ComposeLearningContext & { compose?: string; prefill?: string },
): Record<string, string> {
  const out: Record<string, string> = {
    pathSource: ctx.pathSource,
    compose: ctx.compose ?? '1',
    prefill: ctx.prefill ?? '1',
  }
  const keys: (keyof ComposeLearningContext)[] = [
    'courseSlug',
    'courseId',
    'courseTitle',
    'lessonSlug',
    'lessonTitle',
    'learningModuleId',
    'learningNodeId',
    'learningLessonId',
    'moduleTitle',
    'nodeTitle',
  ]
  for (const k of keys) {
    const v = ctx[k]
    if (v) out[k] = v
  }
  return out
}

export function learningContextBackHref(ctx: ComposeLearningContext): string | null {
  if (ctx.pathSource === 'learning-path') {
    if (ctx.learningModuleId && ctx.learningNodeId && ctx.learningLessonId) {
      return `/tutorial/${encodeURIComponent(ctx.learningModuleId)}/${encodeURIComponent(ctx.learningNodeId)}/${encodeURIComponent(ctx.learningLessonId)}`
    }
    if (ctx.learningModuleId) return `/tutorial/${encodeURIComponent(ctx.learningModuleId)}`
    return '/tutorial'
  }
  if (ctx.courseSlug && ctx.lessonSlug) {
    return `/courses/${encodeURIComponent(ctx.courseSlug)}/learn/${encodeURIComponent(ctx.lessonSlug)}`
  }
  if (ctx.courseSlug) return `/courses/${encodeURIComponent(ctx.courseSlug)}`
  return null
}

export function postLearningBackHref(post: Pick<
  Post,
  | 'pathSource'
  | 'courseSlug'
  | 'lessonSlug'
  | 'learningModuleId'
  | 'learningNodeId'
  | 'learningLessonId'
>): string | null {
  return learningContextBackHref({
    pathSource: (post.pathSource as PathSource) || (post.learningLessonId ? 'learning-path' : 'course'),
    courseSlug: post.courseSlug ?? undefined,
    lessonSlug: post.lessonSlug ?? undefined,
    learningModuleId: post.learningModuleId ?? undefined,
    learningNodeId: post.learningNodeId ?? undefined,
    learningLessonId: post.learningLessonId ?? undefined,
  })
}

export function createPostBodyFromContext(ctx: ComposeLearningContext) {
  return {
    pathSource: ctx.pathSource,
    contextTitle: buildContextTitle(ctx),
    courseId: ctx.courseId,
    courseSlug: ctx.courseSlug,
    lessonSlug: ctx.lessonSlug,
    learningModuleId: ctx.learningModuleId,
    learningNodeId: ctx.learningNodeId,
    learningLessonId: ctx.learningLessonId,
  }
}
