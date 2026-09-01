# `/studio/concepts` — TRACE

Studio editor for the concepts kernel (catalog + taxonomy registry) and LP usage cross-check.

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Thin `'use client'` shell → `@/features/concepts/public` |
| `@/features/concepts/ui/studio/StudioConceptsPage.tsx` | Full concepts / taxonomy editor |

## Features

| Domain | Via | Used for |
|--------|-----|----------|
| `concepts` | `public` | `fetchEditorConcepts`, `saveEditorConcepts`, taxonomy registry CRUD |
| `learning-path` | `public` | `fetchEditorLearningPath` — usage rows (which lessons anchor a concept) |
| `auth` | `public` | Studio gate |

## Backend mounts (primary)

- `GET/PUT /api/concepts/editor`
- `GET/PUT /api/concepts/taxonomy-registry/editor`
- `GET /api/learning-path/editor` (read-only usage map)
- Auth session via `/auth/*`

## Notes

- Concepts remain a read-mostly kernel elsewhere; this studio UI is the write surface.
- Domain/subdomain options come from the taxonomy registry (with `FALLBACK_TAXONOMY_REGISTRY`).
