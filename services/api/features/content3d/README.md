# Content3D Feature

This feature is the domain boundary for 3D runtime content:

- Showcase catalog/entities/orbits
- Earth History data (stages, fossils, phyla metadata) — Earth's deep-time
  timeline that powers the `/explore?mode=earth-history` 3D scene.

Public API paths:

- `/api/showcase-entities`
- `/api/showcase-catalog`
- `/api/showcase-orbits`
- `/api/earth-history`
- `/api/fossils`
- `/api/phyla`

## Earth owns deep-time history (SSOT)

| Concern | Owner | Client entry | API |
|--------|--------|--------------|-----|
| Stage timeline, playback, fossils on globe | **`features/content3d/earth/`** | `@/features/content3d/earth/public` | `/api/earth-history`, `/api/fossils`, `/api/phyla` |
| Planet-specific narrative beats (Mars, studio CMS) | **`features/content3d/planet-narrative/`** + adapters | `@/features/content3d/narrative/public` | `/api/planet-narratives` |
| Solar / NASA showcase entities | **`features/content3d/showcase/`** | `@/features/content3d/showcase/public` | `/api/showcase-*` |

**Rule:** Do not add a new generic “narrative space” layer. Earth timeline data flows
`earth-history` API → `useEarthHistoryStore` → Explore UI. Cross-planet story content uses
`planet-narrative` and `narrative/adapters` only when the product is not Earth.

**3D boundary:** `components/3d/EarthScene` is presentational. Fossil loading runs in
`earth/hooks/useStageFossils.ts` (`useExploreStageFossils` on `/explore`,
`useCourseStageFossils` in course lesson embeds).

History note:

- A generic "narrative space" abstraction (`/api/narrative-spaces`,
  `/api/content-3d/spaces/:slug/context`, the Studio narrative editor) was
  removed in May 2026 — see `docs/ARCHITECTURE_AUDIT.md` Drift 3.6.E. The old
  `content3dContextApi` client stub was removed; there is no planned
  `/api/content-3d/...` route. Every former consumer of that abstraction was
  Earth History data anyway, so the wrapper was deleted in favour of
  `useEarthHistoryStore` and the direct `/api/earth-history` path.
