import { getToken } from '@/features/auth/public'
import { getApiPathBase, getMediaBase } from '@/lib/apiConfig'

const BASE = getApiPathBase()
const MEDIA = getMediaBase()

function authHeaders(json = true): HeadersInit {
  const token = getToken()
  const h: HeadersInit = {}
  if (json) (h as Record<string, string>)['Content-Type'] = 'application/json'
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

function assignmentBase(slug: string, lessonSlug: string, cohortId?: string | null) {
  if (cohortId) {
    return `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/assignment/${encodeURIComponent(lessonSlug)}`
  }
  return `${BASE}/courses/${encodeURIComponent(slug)}/assignment/${encodeURIComponent(lessonSlug)}`
}

export async function fetchAssignmentDraft(slug: string, lessonSlug: string, cohortId?: string | null) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/draft`, { headers: authHeaders() })
  return res.json()
}

export async function uploadAssignmentStagingFile(
  file: File,
  submissionId: string,
  variant: string,
) {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', 'assignment-staging')
  form.append('entityId', submissionId)
  form.append('variant', variant)
  const res = await fetch(`${MEDIA}/upload/assignment-staging`, {
    method: 'POST',
    headers: authHeaders(false),
    body: form,
  })
  return res.json()
}

export async function validateAssignmentFiles(
  slug: string,
  lessonSlug: string,
  cohortId?: string | null,
) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/validate-files`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  })
  return res.json()
}

export async function attachStagingFile(
  slug: string,
  lessonSlug: string,
  body: { storageKey: string; url: string; name: string; mime: string; size: number },
  cohortId?: string | null,
) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/staging-files`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function submitAssignment(
  slug: string,
  lessonSlug: string,
  note: string,
  cohortId?: string | null,
) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ note }),
  })
  return res.json()
}
