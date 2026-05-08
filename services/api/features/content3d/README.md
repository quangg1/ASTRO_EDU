# Content3D Feature

This feature is the domain boundary for 3D runtime content:

- Showcase catalog/entities/orbits
- Narrative spaces (beats/world config)
- Earth history + fossils compatibility routes

Compatibility:

- Existing public API paths stay unchanged:
  - `/api/showcase-entities`
  - `/api/showcase-catalog`
  - `/api/showcase-orbits`
  - `/api/narrative-spaces`
  - `/api/earth-history`
  - `/api/fossils`
  - `/api/phyla`

Bridge endpoint (new):

- `/api/content-3d/spaces/:slug/context`
  - Returns one payload that combines narrative and related 3D scene context.
