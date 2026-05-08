# Courses Feature Domains

This feature currently contains four sub-domains. Files are not physically separated yet (Phase 1), but new changes should follow these boundaries:

- `tutorials/`  
  Tutorial catalog, tutorial progress, tutorial tracks.

- `curriculum/`  
  Learning path, concepts, lesson structure, progress events.

- `delivery/`  
  Course publishing, enrollment, lesson delivery, paywall behavior.

- `showcase3d/`  
  3D showcase entities, catalog bundles, orbit integrations, narrative bridges.

Notes:

- Keep external API routes stable (`/api/courses`, `/api/learning-path`, `/api/concepts`, etc.).
- Prefer service-level integration (`services/eventBus`) over direct cross-feature calls.
