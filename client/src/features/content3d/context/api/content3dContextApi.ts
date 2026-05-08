import { getApiPathBase } from '@/lib/apiConfig'

/** Response from GET /api/content-3d/spaces/:slug/context */
export type Content3dSpaceContextDTO = {
  narrative: Record<string, unknown>
  scene3d: {
    bodySlug: string
    effectTags: string[]
    relatedEntities: Array<{
      id: string
      name: string
      nameVi: string
      group: string
      textureUrl: string
      orbit: {
        parentId: string
        orbitAround: string
        orbitColor: string
        orbitalElements: unknown
      } | null
    }>
  }
}

export async function fetchContent3dSpaceContext(slug: string): Promise<Content3dSpaceContextDTO | null> {
  try {
    const base = getApiPathBase()
    const res = await fetch(
      `${base}/content-3d/spaces/${encodeURIComponent(slug)}/context`,
      { cache: 'no-store' },
    )
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success || !json?.data?.narrative) return null
    return json.data as Content3dSpaceContextDTO
  } catch {
    return null
  }
}
