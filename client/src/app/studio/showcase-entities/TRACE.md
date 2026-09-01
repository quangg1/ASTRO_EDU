# `/studio/showcase-entities` — TRACE

Studio CMS for showcase 3D entity contents (media, panel blocks, optional planet narrative / history).

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Thin `'use client'` shell → `@/features/content3d/showcase/public` |
| `@/features/content3d/showcase/ui/studio/StudioShowcaseEntitiesPage.tsx` | Catalog list + entity editor + Suspense wrapper |
| `app/studio/showcase-entities/ShowcaseEntityPicker.tsx` | Entity picker / hierarchy |
| `app/studio/showcase-entities/ShowcaseMediaUrlField.tsx` | Media URL + upload field |
| `app/studio/showcase-entities/ShowcaseEntityPreviewCard.tsx` | Live preview card |
| `app/studio/showcase-entities/narrative/*` | Narrative / history editor for capable entities |
| `app/studio/showcase-entities/{showcaseEntityHierarchy,entityHistoryCapability}.ts` | Sort / capability helpers |

## Features

| Domain | Via | Used for |
|--------|-----|----------|
| `content3d/showcase` | `public` | Entity CRUD, save contents, JPL orbit sync |
| `learning-path` | `public` | `useLearningPath` — LP lesson links in panel config |
| `courses` | `public` | `UploadMediaContext` typing for showcase uploads |
| `auth` | `public` | Studio gate (`canEnterStudio`) |

## Backend mounts (primary)

- `GET/PUT /api/showcase-entities/editor` (+ create/delete entity)
- `POST /api/showcase-orbits/...` (JPL sync)
- Related catalog refresh via showcase catalog gen / `notifyShowcaseCatalogChanged`
- Media upload through courses media upload purpose `showcase-entity`
- Auth session via `/auth/*`

## Notes

- URL `?entity=` selects the active row (search params → Suspense boundary).
- NASA / solar seed catalogs still resolve via `@/lib/showcaseEntities` + `@/lib/solarSystemData` (DOMAIN_MAP PR10 exception).
