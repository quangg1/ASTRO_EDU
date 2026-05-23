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

History note:

- A generic "narrative space" abstraction (`/api/narrative-spaces`,
  `/api/content-3d/spaces/:slug/context`, the Studio narrative editor) was
  removed in May 2026 — see `docs/ARCHITECTURE_AUDIT.md` Drift 3.6.E. Every
  consumer of the abstraction was Earth History data anyway, so the wrapper
  was deleted in favour of a slim `useEarthHistoryStore` on the client and
  the direct `/api/earth-history` data path on the server. 3D scope is now
  scoped to "teaching aid": one well-crafted Earth scene plus the Showcase
  solar system, with the InfoPanel as the primary educational surface.
