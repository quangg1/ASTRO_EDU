# Domain Map — Galaxies Client

Single source of truth for the **frontend ↔ backend** alignment during the modular refactor.
Every backend bounded context maps to exactly one frontend domain folder. New code MUST be placed
in the target folder. **Phase 4 (done)** removed legacy re-export shims (`lib/*Api.ts`, duplicate
`features/narrative/*`, empty `store/` shims, etc.): import from **`features/<domain>/public`** or,
where appropriate, **`features/<domain>/api/<file>`** (`app/` UI may use `api/` for auth actions).

> Naming convention: **`client/src/features/<domain>/`** (chosen over `domains/` to match backend
> `services/api/features/`). No duplication — never both `features/` and `domains/`.

---

## Backend ↔ Frontend ↔ API ↔ Env

| Backend feature (services/api) | Public mounts | Frontend domain (target) | Current lib/ files (to migrate) | Stores | Env vars |
|---|---|---|---|---|---|
| `auth` | `/auth/*` | `features/auth/` | **`public`** (token + **`useAuthStore`**); **`api/authApi`** (login/register/profile); `lib/firebaseClient.ts`, `lib/roles.ts` | `features/auth/stores/useAuthStore.ts` | `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_FIREBASE_*` |
| `courses` (delivery) | `/api/courses/*`, `/api/tutorials/*` | `features/courses/` | **`api/coursesApi`**, **`api/server`** (SSR outline); tutorial curriculum helpers still in `lib/` | `features/courses/stores/useTutorContextStore.ts` | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_COURSES_URL` |
| `courses` (curriculum / learning-path) | `/api/learning-path/*` | `features/learning-path/` | API + **`public`** (`useLearningPath`, progress helpers) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `concepts` (KERNEL) | `/api/concepts/*` | `features/concepts/` | **`public`** barrel + **`features/concepts/lib/`** `{conceptAnchorsHtml,knowledgeGraphData}` | — | `NEXT_PUBLIC_API_BASE_URL` |
| `content3d/showcase` | `/api/showcase-entities/*`, `/api/showcase-catalog/*`, `/api/showcase-orbits/*` | `features/content3d/showcase/` | **`showcase/api/*`**; **`showcase/public`** (store + bridge); solar/NASA merge helpers remain in `lib/` | `features/content3d/showcase/stores/showcaseStore.ts` | `NEXT_PUBLIC_API_BASE_URL` |
| `content3d/narrative` | `/api/narrative-spaces/*` | `features/content3d/narrative/` | **`narrative/api/narrativeSpacesApi`**, **`narrative/public`** | Runtime in `content3d/narrative/` | `NEXT_PUBLIC_API_BASE_URL` |
| `content3d/earth` (presentational + fallback) | `/api/fossils/*`, `/api/earth-history/*` | `features/content3d/earth/` | **`earth/api/{earthApi,earthHistoryApi}`**; **`earth/lib/earthHistoryData`** (SSOT); **`earth/public`** (stages + stores) | `sceneCommandStore`, `playbackStore` | `NEXT_PUBLIC_API_BASE_URL`, legacy earth-history envs |
| `content3d` (cross-cutting context) | `/api/content-3d/spaces/:slug/context` (planned) | `features/content3d/context/` | **`context/api/content3dContextApi`** | — | `NEXT_PUBLIC_API_BASE_URL` |
| `rewards` | `/api/gems/*`, `/api/showcase/*` (gamification) | `features/rewards/` | **`api/gemsWalletApi`**, **`rewards/public`** | client-first gem cache in `features/rewards/lib/gemWallet.ts` | `NEXT_PUBLIC_API_BASE_URL` |
| `payment` | `/api/payments/*` | `features/payment/` | **`api/paymentApi`** (checkout + orders) | — | `NEXT_PUBLIC_API_BASE_URL` |
| `community` | `/api/forums/*`, `/api/posts/*`, `/api/news/*` | `features/community/` | **`community/api/communityApi`**; `lib/postContent.ts`, `lib/postEngagement.ts` | — | `NEXT_PUBLIC_API_BASE_URL` |
| `admin` | `/api/admin/*` | `features/admin/` | **`features/admin/api/adminAnalyticsApi`** | — | `NEXT_PUBLIC_API_BASE_URL` |
| `media` | `/upload`, `/files/*` | (no dedicated frontend domain) | `lib/apiConfig.ts:resolveMediaUrl` (kept in shared) | — | `NEXT_PUBLIC_API_BASE_URL` |

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
- **Content3d:** narrative runtime under `features/content3d/narrative/` + **`narrative/public.ts`**. Earth: `features/content3d/earth/stores/{sceneCommandStore,playbackStore}.ts`, **`earth/public.ts`**. Showcase: `stores/showcaseStore.ts`, `types.ts`, `lib/showcaseLearningBridge.ts`, **`showcase/public.ts`**.
- **Rewards:** `api/gemsWalletApi.ts` (server fetch) + `lib/gemWallet.ts` (localStorage + orchestration); **`rewards/public`** (gems + re-export showcase gamification API).
- **Concepts kernel:** **`features/concepts/lib/{conceptAnchorsHtml,knowledgeGraphData}.ts`** + **`concepts/public`**; matching `lib/*` shims.
- **Canonical store location:** `useAuthStore` lives in **`features/auth/stores/`** (exported via `auth/public`).
- **Phase 4:** removed shim `src/store/*`, `hooks/useLearningPath.ts`, `lib/*Api` re-exports, duplicate `features/narrative/*`, `features/{scene,playback,showcase}/` shims.
- **Remainder:** solar cockpit + NASA catalog merge helpers still live under `lib/` (data/orchestration only, not domain API shims).

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
| `features/narrative/*` | `features/content3d/narrative/*` | move under content3d (current narrativeSpacesApi.ts moves into the api/ subfolder) |
| `features/narrative/earthHistoryTypes.ts` | `features/content3d/narrative/earthHistoryTypes.ts` | done; **`@/types`** re-exports from content3d path |

---

## Earth / Narrative Single-Source-of-Truth (SSOT) policy

**Production:**
1. `narrativeSpaceService.getActiveSpace(slug)` → API first (`/api/narrative-spaces/:slug`).
2. If API returns 404 / no beats → `fetchEarthHistoryStages()` (legacy `/api/earth-history`).
3. Only if both fail (offline/dev with no DB seed) → static `earthHistoryData` from `features/content3d/earth/lib/earthHistoryData.ts`.

**Editor (studio):** uses `/api/narrative-spaces/:slug/editor` (auth + role) — bypasses publish gate. Bootstrap from preset only on first save.

**Phase 3–4 (done):** Static beats live only in **`features/content3d/earth/lib/earthHistoryData.ts`**. The narrative Earth preset is the sole allowed deep importer (`features/content3d/narrative/presets/earth.ts` avoids pulling `earth/public` Zustand into the preset graph). Prefer **`@/features/content3d/earth/public`** for runtime callers. **`npm run check:earth-ssot`** enforces the boundary.

---

## Import boundary rules (enforced gradually by `scripts/check-import-boundaries.mjs`)

1. `client/src/components/3d/**` MUST NOT import `@/lib/*Api` or `@/features/*/api/*` directly.
   It receives data via props, or via a domain hook from the parent (page/orchestrator).
   **Allowlist:** empty — new violations fail CI (`scripts/check-import-boundaries.mjs`).
2. `client/src/app/**` may import `features/<domain>/public` and `shared/*`. It MUST NOT
   re-implement fetch logic that already exists in a domain `api/`.
3. Feature folder A imports from feature B: only via `features/<B>/public` (see pragmatic `lib/*` exception above).
4. `shared/*` MUST NOT import any `features/*`.

These rules are advisory in Phase 0; enforced by CI script in Phase 1+.

---

## Migration completion checkboxes

- [x] Phase 0: domain map + boundary script
- [x] Phase 1: `lib/*Api.ts` → `features/<domain>/api/` + shims
- [x] Phase 2: hooks + stores + content3d narrative/earth/showcase consolidation + rewards gem split + concepts lib; `useAuthStore` canonical = `features/auth/stores`
- [x] Phase 3: Earth SSOT — canonical `earthHistoryData` under `content3d/earth/lib/`; `check:earth-ssot` guardrail
- [x] Phase 4: **shims deleted** (`lib/*Api`, duplicate narrative + empty `store/`, learning-path hook shim, SSOT shim); **`check-import-boundaries` allowlist cleared** (`EarthScene` uses `earthApi` path that does not violate the flat `features/*/api/*` matcher). oversized page splits + strict lint polish **optional follow-up**.

---

## Open questions (remaining)

1. ~~**`paymentApi` vs `paymentsApi`**~~ — **resolved (Phase 1):** canonical `features/payment/api/paymentApi.ts`; both legacy paths shim to it.
2. ~~**`gemWallet` split**~~ — **resolved (Phase 2):** `features/rewards/api/gemsWalletApi.ts` + `features/rewards/lib/gemWallet.ts` + **`rewards/public`**.
3. ~~**`showcaseLearningBridge` home**~~ — **resolved:** canonical under **`features/content3d/showcase/lib/`** (+ **`showcase/public`**).
4. ~~**`useTutorContextStore`**~~ — **resolved (Phase 2):** `features/courses/stores/useTutorContextStore.ts` (+ `courses/public`; supports `general` | `course` modes as before).
5. **Concept kernel pattern** — `features/concepts/` is purely a kernel (read by learning-path + content3d/showcase + future content3d/narrative). It has `api/` + `types.ts` + `lib/` but no `stores/` or `ui/`. Documented here so reviewers don't try to add UI to this folder.
