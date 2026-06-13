import { getApiPathBase, getUploadBase } from '@/lib/apiConfig'
import { apiFetchInit } from '@/lib/apiClientHeaders'

const BASE = getApiPathBase()

function assignmentBase(slug: string, lessonSlug: string, cohortId?: string | null) {
  if (cohortId) {
    return `${BASE}/courses/${encodeURIComponent(slug)}/cohort/${encodeURIComponent(cohortId)}/assignment/${encodeURIComponent(lessonSlug)}`
  }
  return `${BASE}/courses/${encodeURIComponent(slug)}/assignment/${encodeURIComponent(lessonSlug)}`
}

export async function fetchAssignmentDraft(slug: string, lessonSlug: string, cohortId?: string | null) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/draft`, apiFetchInit())
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
  const res = await fetch(`${getUploadBase()}/upload/assignment-staging`, apiFetchInit({
    method: 'POST',
    body: form,
  }, false))
  return res.json()
}

export async function validateAssignmentFiles(
  slug: string,
  lessonSlug: string,
  cohortId?: string | null,
) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/validate-files`, apiFetchInit({
    method: 'POST',
    body: JSON.stringify({}),
  }))
  return res.json()
}

export async function attachStagingFile(
  slug: string,
  lessonSlug: string,
  body: { storageKey: string; url: string; name: string; mime: string; size: number },
  cohortId?: string | null,
) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/staging-files`, apiFetchInit({
    method: 'POST',
    body: JSON.stringify(body),
  }))
  return res.json()
}

export async function submitAssignment(
  slug: string,
  lessonSlug: string,
  note: string,
  cohortId?: string | null,
) {
  const res = await fetch(`${assignmentBase(slug, lessonSlug, cohortId)}/submit`, apiFetchInit({
    method: 'POST',
    body: JSON.stringify({ note }),
  }))
  return res.json()
}
