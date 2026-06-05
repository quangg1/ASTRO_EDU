# Domain Map — Galaxies Client

Single source of truth for the **frontend ↔ backend** alignment during the modular refactor.
Every backend bounded context maps to exactly one frontend domain folder. New code MUST be placed
in the target folder. **Phase 4 (done)** removed legacy re-export shims (`lib/*Api.ts`, duplicate
`features/narrative/*`, empty `store/` shims, etc.). **`app/`** imports **`features/<domain>/public`**
only (enforced by `check:app-public`). Non-`app/` feature code may still import sibling `api/` when needed.

> Naming convention: **`client/src/features/<domain>/`** (chosen over `domains/` to match backend
> `services/api/features/`). No duplication — never both `features/` and `domains/`.

---

## Backend ↔ Frontend ↔ API ↔ Env

| Backend feature (services/api) | Public mounts | Frontend domain (target) | Current lib/ files (to migrate) | Stores | Env vars |
|---|---|---|---|---|---|
| `auth` | `/auth/*` | `features/auth/` | **`public`** (token + **`useAuthStore`**); **`api/authApi`** (login/register/profile); `lib/firebaseClient.ts`, `lib/roles.ts` | `features/auth/stores/useAuthStore.ts` | `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_FIREBASE_*` |
| `courses` (delivery) | `/api/courses/*`, `/api/tutorials/*` | `features/courses/` | Client: **`courses/public`** (`coursesApi` + store). RSC only: **`courses/server`** (`api/server`). | `features/courses/stores/useTutorContextStore.ts` | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_COURSES_URL` |
| `courses` (curriculum / learning-path) | `/api/learning-path/*` | `features/learning-path/` | API + **`public`** (`useLearningPath`, progress helpers) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `concepts` (KERNEL) | `/api/concepts/*` | `features/concepts/` | **`public`** barrel + **`features/concepts/lib/`** `{conceptAnchorsHtml,knowledgeGraphData}` | — | `NEXT_PUBLIC_API_BASE_URL` |
| `content3d/showcase` | `/api/showcase-entities/*`, `/api/showcase-catalog/*`, `/api/showcase-orbits/*` | `features/content3d/showcase/` | **`showcase/api/*`**; **`showcase/public`** (store + bridge); solar/NASA merge helpers remain in `lib/` | `features/content3d/showcase/stores/showcaseStore.ts` | `NEXT_PUBLIC_API_BASE_URL` |
| `content3d/earth-history` (data) | `/api/earth-history/*`, `/api/fossils/*`, `/api/phyla/*` | `features/content3d/earth/` | **`earth/api/{earthApi,earthHistoryApi}`**; **`earth/lib/{earthHistoryData,earthHistoryTypes,earthHistoryHelpers}`** (SSOT); **`earth/public`** (stages + stores + types) | `sceneCommandStore`, `playbackStore`, `earthHistoryStore` | `NEXT_PUBLIC_API_BASE_URL`, legacy earth-history envs |
| `rewards` | `/api/gems/*`, `/api/showcase/*` (gamification) | `features/rewards/` | **`api/gemsWalletApi`**, **`rewards/public`**; **`rewards/lib/{gemWallet,solarJourneyProgress}`** | client-first gem cache in `features/rewards/lib/gemWallet.ts` | `NEXT_PUBLIC_API_BASE_URL` |
| `payment` | `/api/payments/*` | `features/payment/` | **`api/paymentApi`** (checkout + orders) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `community` | `/api/forums/*`, `/api/posts/*`, `/api/news/*` | `features/community/` | **`community/api/communityApi`**; **`community/lib/{postContent,postEngagement}`** (re-exported from **`community/public`**) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `admin` | `/api/admin/*` | `features/admin/` | **`features/admin/public`** (analytics, users, promo, broadcast, gem-economy) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `promotions` | `/api/promotions/*` | `features/promotions/` | **`features/promotions/public`** | — | `NEXT_PUBLIC_API_BASE_URL` |
| `notifications` | `/api/notifications/*` | `features/notifications/` | **`features/notifications/public`** | — | `NEXT_PUBLIC_API_BASE_URL` |
| `media` | `/upload`, `/files/*` | (no dedicated frontend domain) | `lib/apiConfig.ts:resolveMediaUrl` (kept in shared) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `agent` | `/api/agent/*` | `features/agent/` | **`agent/public`** (chat, coach, concept quiz, tools) | — | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AI_SERVICE_URL` |
| `learning-state` | `/api/learning-state/*` | `features/learning-state/` | **`learning-state/public`** | — | `NEXT_PUBLIC_API_BASE_URL` |
| `explore` (client hub) | `/api/explore/*`, sky-targets, contextual-quiz | `features/explore/`, `app/explore/` | `explore/public`, sky assets CDN via `skyAssets.ts` | — | `NEXT_PUBLIC_MEDIA_CDN` (prefix `/sky/`) |

**Use case diagram ↔ code:** see [`docs/use-case-coverage.md`](../docs/use-case-coverage.md) — hầu hết use case trên sơ đồ UML **đã có**; sơ đồ **chưa** phản ánh Explore sky, agent, gems, community.

---

## Cross-cutting / `shared/`

Pure utilities with no domain meaning. After Phase 1 they live under `client/src/shared/lib/`:

| File | Rationale |
|---|---|
| `lib/cn.ts` | className join |
| `lib/geo.ts` | lat/lng vector math |
| `lib/ssrStableRandom.ts` | RNG seed for SSR hydration |
| `lib/apiConfig.ts` | base URL + media URL resolution |
| `lib/navigationConfig.ts` | top-nav config |
| `lib/analytics.ts` + `lib/analytics/*` | telemetry primitives |
| `lib/topicPathMapping.ts` | route helper (cross-cutting) |
| `lib/hybrid/*` | Capacitor adapter shims |

### PR10 — Earth / showcase data still under `lib/` (pragmatic exception)

These modules are consumed from **3D + studio + sometimes SSR**; keeping them in `lib/` avoids churn and circular imports until a dedicated move PR splits consumers. Import paths stay `@/lib/...` for now:

| File | Role |
|---|---|
| `solarSystemData.ts`, `solarOrbitMath.ts` | Showcase orbit / body catalog |
| `showcaseEntities.ts`, `mergeShowcaseCatalog.ts` | NASA showcase merge |
| `paleoTextureMap.ts`, `planetTextureQuality.ts`, `stageHotspots.ts` | Earth / stage visuals |
| `geo.ts`, `geoPlaces.ts` | Shared geo math + places |
| `iconicOrganisms.ts`, `fossilPhyla.ts` | Earth lesson / fossil taxonomy helpers |

---

## Per-domain folder layout (target)

```
features/<domain>/
  api/                   # fetch wrappers only — no React, no Three.js
    <domain>Api.ts
    server.ts            # SSR-only fetchers (when needed)
  hooks/                 # React hooks consuming api/ + stores
  stores/                # Zustand stores (only when state outlives a single tree)
  lib/                   # domain-specific helpers (progress math, behavior)
  ui/                    # components used ONLY by this domain (optional)
  types.ts               # public DTOs
  public.ts              # barrel — the ONLY allowed cross-domain entry point
```

**Cross-domain import rule:** other feature folders and `app/` code import from `features/<other>/public` (the barrel), not deep `./api`/`./hooks` paths.

**Pragmatic exception (Phase 2–3):** files still under `client/src/lib/*` that must stay **server-safe** / tree-shake friendly may import types or pure helpers from `features/<domain>/lib/...` instead of `public.ts`, so a type-only dependency does not transitively pull `'use client'` modules from the same barrel.

---

## Phase 2 progress (hooks, stores, domain lib, barrels) — complete

- **Learning-path:** `hooks/useLearningPath.ts`, `lib/{learningPathProgress,learningPathBehavior,lessonRecallQuiz}.ts` under **`features/learning-path/`**, plus **`public.ts`**.
- **Auth / courses:** `features/auth/stores/useAuthStore.ts` + **`auth/public`**; `features/courses/stores/useTutorContextStore.ts` + **`courses/public`**.
- **Content3d:** Earth: `features/content3d/earth/stores/{sceneCommandStore,playbackStore,earthHistoryStore}.ts`, **`earth/public.ts`** (also exports types + helpers from `earth/lib/`). Showcase: `stores/showcaseStore.ts`, `types.ts`, `lib/showcaseLearningBridge.ts`, **`showcase/public.ts`**. **Narrative wrapper removed May 2026** (see ARCHITECTURE_AUDIT Drift 3.6.E) — its only domain was Earth History, now owned directly by `earth/`.
- **Rewards:** `api/gemsWalletApi.ts` (server fetch) + `lib/gemWallet.ts` + **`rewards/lib/solarJourneyProgress.ts`** (localStorage + API sync); **`rewards/public`** (gems + showcase gamification + solar journey exports).
- **Concepts kernel:** **`features/concepts/lib/{conceptAnchorsHtml,knowledgeGraphData}.ts`** + **`concepts/public`**; matching `lib/*` shims.
- **Canonical store location:** `useAuthStore` lives in **`features/auth/stores/`** (exported via `auth/public`).
- **Phase 4:** removed shim `src/store/*`, `hooks/useLearningPath.ts`, `lib/*Api` re-exports, duplicate `features/narrative/*`, `features/{scene,playback,showcase}/` shims.
- **PR10:** `postContent` / `postEngagement` → **`features/community/lib/`** (barrel: **`community/public`**). `solarJourneyProgress` → **`features/rewards/lib/`** (barrel: **`rewards/public`**). Earth/showcase data files listed above remain under `lib/` as pragmatic exceptions.
- **Remainder:** NASA catalog merge + orbit/geo helpers still live under `lib/` (see **PR10 — Earth / showcase data** table above).

---

## Re-org of legacy `client/src/features/*` already present

Today's `client/src/features/` is a partial migration:

| Existing | New location | Notes |
|---|---|---|
| `features/auth/types.ts` | `features/auth/types.ts` | keep |
| `features/courses/types.ts` | `features/courses/types.ts` | keep, expand |
| `features/showcase/types.ts` | `features/content3d/showcase/types.ts` | move under content3d |
| `features/scene/store.ts` | `features/content3d/earth/stores/sceneCommandStore.ts` | move under content3d/earth |
| `features/playback/store.ts` | `features/content3d/earth/stores/playbackStore.ts` | move under content3d/earth |
| `features/narrative/*` | _deleted_ | the narrative wrapper was an unused abstraction; Earth History now lives directly under `features/content3d/earth/` |
| `features/narrative/earthHistoryTypes.ts` | `features/content3d/earth/lib/earthHistoryTypes.ts` | **`@/types`** re-exports from the new path |

---

## Earth History Single-Source-of-Truth (SSOT) policy

**Production:**
1. `useEarthHistoryStore.loadStages()` calls `fetchEarthHistoryStages()` → `GET /api/earth-history` (DB-backed Mongo data).
2. If API returns no rows (cold seed) → falls back to static `earthHistoryData` from **`features/content3d/earth/lib/earthHistoryData.ts`**.

**Editor (studio):** Earth History stages are seed-managed (no in-app editor any more). The previous narrative editor was removed in May 2026 — see ARCHITECTURE_AUDIT Drift 3.6.E for rationale. Adding back an editor means writing a thin admin CRUD against `/api/earth-history`, not resurrecting the narrative abstraction.

**Phase 3–4 (done):** Static stages live only in **`features/content3d/earth/lib/earthHistoryData.ts`**. Prefer **`@/features/content3d/earth/public`** for all runtime callers. **`npm run check:earth-ssot`** enforces the boundary.

---

## Import boundary rules (enforced gradually by `scripts/check-import-boundaries.mjs`)

1. `client/src/components/3d/**` MUST NOT import `@/lib/*Api` or `@/features/*/api/*` directly.
   It receives data via props, or via a domain hook from the parent (page/orchestrator).
   **Allowlist:** empty — new violations fail CI (`scripts/check-import-boundaries.mjs`).
2. `client/src/app/**` MUST import `features/<domain>/public` (not deep `./api/*`).
   Enforced by **`npm run check:app-public`** (hooked in `check:guards` / `prebuild`).
3. Feature folder A imports from feature B: only via `features/<B>/public` (see pragmatic `lib/*` exception above).
4. `shared/*` MUST NOT import any `features/*`.

**Earth 3D fetch:** `app/explore` calls `useExploreStageFossils`; course lesson pages call `useCourseStageFossils` and pass `overrideFossils` into `EarthScene` — the 3D component does not call `earthApi` directly.

---

## Migration completion checkboxes

- [x] Phase 0: domain map + boundary script
- [x] Phase 1: `lib/*Api.ts` → `features/<domain>/api/` + shims
- [x] Phase 2: hooks + stores + content3d narrative/earth/showcase consolidation + rewards gem split + concepts lib; `useAuthStore` canonical = `features/auth/stores`
- [x] Phase 3: Earth SSOT — canonical `earthHistoryData` under `content3d/earth/lib/`; `check:earth-ssot` guardrail
- [x] Phase 4: **shims deleted** (`lib/*Api`, duplicate narrative + empty `store/`, learning-path hook shim, SSOT shim); **`check-import-boundaries` allowlist cleared**.
- [x] **Hygiene wave (2026-05):** `app/` → `features/*/public` only (`check:app-public`); `EarthScene` fossil fetch lifted to `earth/hooks/useStageFossils`; expanded barrels (`courses`, `showcase`, `promotions`, `notifications`, `admin`); backend `adminOrderService` / `adminUserService` / `teacherApplicationService` colocated under `features/admin|auth/services/`.

---

## Open questions (remaining)

1. ~~**`paymentApi` vs `paymentsApi`**~~ — **resolved (Phase 1):** canonical `features/payment/api/paymentApi.ts`; both legacy paths shim to it.
2. ~~**`gemWallet` split**~~ — **resolved (Phase 2):** `features/rewards/api/gemsWalletApi.ts` + `features/rewards/lib/gemWallet.ts` + **`rewards/public`**.
3. ~~**`showcaseLearningBridge` home**~~ — **resolved:** canonical under **`features/content3d/showcase/lib/`** (+ **`showcase/public`**).
4. ~~**`useTutorContextStore`**~~ — **resolved (Phase 2):** `features/courses/stores/useTutorContextStore.ts` (+ `courses/public`; supports `general` | `course` modes as before).
5. **Concept kernel pattern** — `features/concepts/` is purely a kernel (read by learning-path + content3d/showcase + content3d/earth). It has `api/` + `types.ts` + `lib/` but no `stores/` or `ui/`. Documented here so reviewers don't try to add UI to this folder.
