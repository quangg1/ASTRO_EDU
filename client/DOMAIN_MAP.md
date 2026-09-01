# Domain Map — Galaxies Client

SSOT for **frontend ↔ backend** alignment. Every backend bounded context maps to one frontend
`features/<domain>/` folder. **`app/`** and cross-feature code import only via
`features/<domain>/public` (or `server` for RSC) — enforced by `check:app-public` +
`check:feature-public`.

Machine-readable route fan-out: **[`ROUTE_INVENTORY.md`](./ROUTE_INVENTORY.md)** (generated).
Architecture narrative: [`docs/architecture/frontend-layering.md`](../docs/architecture/frontend-layering.md).

> Naming: `client/src/features/<domain>/` matches `services/api/features/`. Never both `features/` and `domains/`.

---

## Backend ↔ Frontend ↔ API ↔ Env

| Backend feature | Public mounts | Frontend domain | Entry | Stores / notes |
|---|---|---|---|---|
| `auth` | `/auth/*` | `features/auth/` | `public` (+ UI) | `useAuthStore` |
| `courses` | `/api/courses/*`, `/api/tutorials/*` | `features/courses/` | `public` / `server` | `useTutorContextStore`; UI under `ui/` |
| `learning-path` | `/api/learning-path/*` | `features/learning-path/` | `public` / `server` | Curriculum data: `data/learningPathCurriculum` |
| `concepts` | `/api/concepts/*` | `features/concepts/` | `public` | Studio UI under `ui/studio/` |
| `content3d/showcase` | `/api/showcase-*`, explore quiz/sky | `features/content3d/showcase/` | `public` | Catalog libs in `showcase/lib/` (not root `lib/`) |
| `content3d/earth-history` | `/api/earth-history/*`, fossils, phyla | `features/content3d/earth/` | `public` | Earth SSOT libs; 3D stays in `components/3d/` |
| `content3d` narrative | `/api/planet-narratives/*` | `features/content3d/narrative/` + `planet-narrative/api` | `narrative/public` | Live planet narrative domain (not deleted) |
| `rewards` | `/api/gems/*`, `/api/showcase` gamification | `features/rewards/` | `public` | Gem shop UI under `ui/` |
| `payment` | `/api/payments/*` | `features/payment/` | `public` | Checkout / orders UI |
| `community` | `/api/forums|posts|comments|news|community` | `features/community/` | `public` | Domain UI under `ui/` |
| `admin` | `/api/admin/*` | `features/admin/` | `public` | Ops console pages |
| `promotions` | `/api/promotions/*` | `features/promotions/` | `public` | |
| `notifications` | `/api/notifications/*` | `features/notifications/` | `public` | |
| `users` | `/api/users/*` | `features/users/` | `public` | Profile / avatar UI |
| `messages` | `/api/messages/*` | `features/messages/` | `public` | |
| `agent` | `/api/agent/*` | `features/agent/` | `public` | Cosmo widget UI under `ui/` |
| `learning-state` | `/api/learning-state/*` | `features/learning-state/` | `public` | |
| `onboarding` | `/api/onboarding/*` | `features/onboarding/` | `public` | Wizard + dashboard panels |
| `astronomy-calendar` | `/api/astronomy-calendar/*` | `features/astronomy-calendar/` | `public` | Studio + learner calendar |
| `media` | `/upload`, `/files/*` | (shared) | `lib/apiConfig` | No dedicated FE domain |
| explore hub (client) | `/api/explore/*` | `features/explore/` + `app/explore/` | `explore/public` | Orchestrator in `app/explore/` |

---

## Folder layout (target — current)

```
features/<domain>/
  public.ts          # ONLY cross-boundary entry (client)
  server.ts          # RSC-only; never re-exported from public
  api/ hooks/ stores/ lib/ ui/ data/
app/<route>/
  page.tsx           # thin orchestrator
  TRACE.md           # required for fat/studio/explore hubs
components/
  3d/                # presentational Three.js (no feature api imports)
  ui/ layout/ …      # shared chrome
  <domain>/          # debt — migrate to features/<domain>/ui (hybrid ratchet)
lib/                 # cross-cutting only (cn, apiConfig, analytics, geo…)
```

**Import law**

| From | Allowed |
|------|---------|
| `app/**` | `@/features/*/public`, `@/features/*/server`, shared `lib/`, `components/3d|ui|layout`, `design-system` |
| `features/A` → `features/B` | only `B/public` |
| `components/**` | no deep `features/*/api` (allowlist = 0) |

Guards: `npm run check:guards` (includes inventory `--check`).

---

## Traceability

1. Open [`ROUTE_INVENTORY.md`](./ROUTE_INVENTORY.md) — find the route row (features + backend mounts).
2. Open `app/<route>/TRACE.md` when present for human notes.
3. Follow `features/<domain>/public.ts` → `api/` for HTTP paths → `services/api/features/<domain>/`.

Regenerate inventory: `node scripts/gen-route-inventory.mjs`.

---

## Dual-home policy (hybrid)

New domain UI goes in `features/<domain>/ui/`. Legacy `components/<domain>` is migrated domain-by-domain.
`components/3d` stays presentational forever.
