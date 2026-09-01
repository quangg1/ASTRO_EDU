# `/studio/learning-path` — TRACE

Studio editor for the free learning-path curriculum (modules → nodes → depth → lessons + block content).

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Thin `'use client'` shell → `@/features/learning-path/public` |
| `@/features/learning-path/ui/studio/StudioLearningPathPage.tsx` | Full editor UI + load/save/validation |
| `@/components/studio/{BlockEditor,BlockPalette,LessonPreview}` | Dynamic lesson block tooling |
| `@/components/studio/NodeTopicWeightsEditor` | Node topic weight UI |

## Features

| Domain | Via | Used for |
|--------|-----|----------|
| `learning-path` | `public` | `fetchEditorLearningPath`, `saveEditorLearningPath`, `validateStudioJourney` |
| `concepts` | `public` | `fetchEditorConcepts`, taxonomy registry (anchors / labels) |
| `courses` | `public` | Lesson section TOC helpers + `Lesson` typing for block preview |
| `auth` | `public` | Studio gate (`useAuthStore`) |

## Backend mounts (primary)

- `GET/PUT /api/learning-path/editor` — curriculum modules + publish flag
- `GET /api/concepts/editor` — concept catalog for anchors
- `GET /api/concepts/taxonomy-registry/editor` — domain/subdomain registry
- Auth session via `/auth/*` (redirect if not signed in / not studio-capable)

## Notes

- Journey guardrails run client-side via `validateStudioJourney` before save.
- Block editor is client-only (`dynamic(..., { ssr: false })`).
