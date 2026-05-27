# Architecture Audit — Galaxies (cosmolearn)

> **Mục đích.** Chụp ảnh hiện trạng kiến trúc cuối Phase 4 + đợt dọn dẹp gần nhất (PR1–PR5 design system, 3D scene cleanup, dead-island removal). Tài liệu chia 4 phần. Bạn có thể dừng/tiếp ở bất kỳ phần nào.
>
> Các tài liệu liên quan đã có:
> - `client/DOMAIN_MAP.md` — bản spec target của FE↔BE alignment (Phase 0–4 plan).
> - `client/src/design-system/README.md` — 3-layer design system spec.
> - `client/src/components/3d/showcase/SHOWCASE_TECH_NOTES.md` — note kỹ thuật 3D showcase.
> - `docs/ARCHITECTURE_MERGED.md`, `docs/EDU_ARCHITECTURE.md`, `docs/AI_TUTOR_PLAN.md` — context lịch sử.
- `docs/plans/learning-agent-system.md`, `docs/plans/agent-entitlement-guardrails.md` — Learning Agent + entitlement audit.
>
> Audit này KHÔNG thay thế các spec trên — nó kiểm tra xem **code thật có khớp spec không**, và liệt kê drift.

### Tiến độ cập nhật doc (2026-05) — dùng khi báo cáo

| Hạng mục | Trạng thái | Ghi chú |
|----------|-----------|---------|
| Hygiene `app/` → `public` | **Done** | `check:app-public` trong `check:guards` + CI `client-guards.yml`; `app/` không còn `@/features/*/api/*` |
| `courses` SSR tách `server-only` | **Done** | RSC: `@/features/courses/server`; client: `@/features/courses/public` (tránh kéo `server-only` vào widget AI) |
| Earth fossil / 3D boundary | **Done** | `useStageFossils`; `EarthScene` presentational; boundary script bắt nested `content3d/*/api` |
| Explore orchestrator | **Done** | `app/explore/{hooks,components}/` + `ExplorePageContent.tsx`; xem `app/explore/README.md` |
| Backend `services/api/services/*` | **Done** | Colocated `features/admin|auth/services/` |
| §2.3 / §2.4 / §3.3 narrative cũ | **Doc refreshed** | Bảng dưới phản ánh `usePlanetNarrativeStore` + xoá `useNarrativeStore` / NarrativeStudioMode |
| Agent entitlement + guardrails | **Planned** | `docs/plans/agent-entitlement-guardrails.md`; parent §3.5–3.7 `learning-agent-system.md`; P0.8–0.10 |
| **Còn mở** (Part 4) | P1/P2 | `cosmic-*` marketing, DS primitives thiếu, `components/` import sâu `api/`, `learning-path/public` re-export `server`, studio showcase-entities dày |

### Hygiene wave (2026-05) — resolved in repo

| ID (Part 4) | Item | Status |
|-------------|------|--------|
| 2.4 / 1.8.A (`app/`) | `app/` deep `features/*/api/*` | **Done** |
| 2.5.A | `EarthScene` direct `earthApi` fetch | **Done** |
| 2.6 | admin analytics + `content3d/context` stub | **Done / removed** |
| 1.7 (backend) | `services/api/services/*` orphan | **Done** |
| Explore split | `explore/page.tsx` ~1k dòng | **Done** — tách module |
| `courses/server` | `public` gộp `server-only` | **Done** — barrel client-only |

---

## Mục lục

- **Part 1** — System inventory (workspace, services, layers, routes, deps)
- **Part 2** — Domain layering (FE↔BE mapping, dependency rules, drift vs `DOMAIN_MAP.md`) — *done*
- **Part 3** — Cross-cutting (design system, state stores, API client, auth, 3D scene mgmt) — *done*
- **Part 4** — Vấn đề hiện tại + nợ kỹ thuật + roadmap đề xuất — *done*

---

# PART 1 — System inventory

## 1.1 Workspace (monorepo top-level)

```
d:\galaxies\
├── client\                  ← Next.js 14 app router (FE chính)
├── services\
│   ├── api\                 ← Node/Express backend (mọi business domain)
│   ├── ai\                  ← Python FastAPI (RAG + AI tutor)
│   ├── embedding\           ← Python service (vector embedding)
│   └── uploads\             ← (rỗng — chỉ là folder placeholder)
├── packages\
│   └── auth-shared\         ← JS package chia sẻ giữa các Node services (jwt verify)
├── docs\                    ← 11 markdown spec/plan
├── scripts\                 ← (rỗng sau cleanup PR5)
├── lich_su_trai_dat_course\ ← raw content (chưa rõ status, có thể là asset source)
├── login_page\              ← (raw HTML mockup cũ?)
├── PALEOMAP PaleoAtlas Rasters v3\  ← raster textures (asset source)
├── package.json             ← root npm workspace + script aggregator
├── README.md, SERVICES.md   ← high-level docs
└── .github\, .claude\       ← CI + AI agent config
```

**Drift 1.1 — Service references chết trong root `package.json`**
Root scripts gọi `services/auth`, `services/courses`, `services/media`, `services/community`, `services/payment`, nhưng các folder này **không tồn tại** — backend đã hợp nhất vào `services/api/features/*`. Các script `dev:auth`, `dev:courses`, `dev:media`, `dev:community`, `dev:payment` và phần lớn của `install:all` đều fail nếu chạy.
→ Cần dọn `package.json` cho thẳng với reality.

**Drift 1.2 — Asset & file rời ở root**
Tệp PDF tiếng Việt mojibake (`C?u tr�c KH vu tr?.pdf`), 2 file `.glb` ở root, `aws_credentials.txt` (⚠ secret tracked?), `cosmolearn-3f58d-firebase-adminsdk-fbsvc-d6086da147.json` (⚠ Firebase admin key trong workspace), `planet_narrative_system_design.html`, `showcase_diagnosis.html`. Cần xác minh các file này có trong `.gitignore` hay không và chuyển vào folder asset.

---

## 1.2 Backend — `services/api`

Express monorepo-in-folder, **organized theo bounded context**. Từng feature là tự chứa: routes + models + services + index.js mount.

```
services/api/
├── server.js                ← entry, mounts features
├── bootstrap/seedCoreData.js
├── config/{db,env}.js       ← Mongoose + env
├── shared/                  ← cross-cutting: errors, jwtAuth, logger, mailer, validation, requestContext, escapeRegex
├── lib/ai/                  ← OpenAI/LLM client + tasks (e.g. generateRecallQuiz)
├── services/                ← cross-feature orchestration: eventBus, adminOrderService, adminUserService, teacherApplicationService
├── data/                    ← seed JSON (achievements, concepts, default learning-path, subdomain layers)
├── scripts/                 ← 19 maintenance scripts (seed, migrate, enrich, sync, crawl, audit)
└── features/                ← 11 bounded contexts ↓
```

### Backend bounded contexts (đếm bằng folder `features/`)

| Feature | Routes | Models (Mongoose) | Sub-services / lib |
|---|---|---|---|
| **`admin`** | `index.js` only | — | uses cross-feature services |
| **`auth`** | `index.js` (mount) | `User`, `TeacherApplication` | `lib/{firebaseAdmin, jwt, oauthUser}` |
| **`community`** | `forums`, `news`, `posts` | `Post`, `Comment`, `Forum`, `Vote` | `postSort.js` |
| **`concepts`** | `concepts.js` | `Concept`, `TaxonomyRegistry` | (kernel) |
| **`content3d`** | `showcaseCatalog`, `showcaseEntities`, `showcaseOrbitsJpl`, `spaceContext` + **nested** `narrative/routes/{earthHistory, fossils, narrativeSpaces, phyla}` | `ShowcaseCatalogBundle`, `ShowcaseEntityContent` + nested narrative `EarthHistory`, `Fossil`, `NarrativeSpace`, `PhylumMetadata` | `narrative/services/narrativeSpace.service.js`, `narrative/lib/paleoPlateNames.js` |
| **`courses`** | `courses`, `tutorials` | `Course`, `Enrollment`, `Tutorial`, `TutorialProgress`, `TutorialTrack` | — |
| **`learning-path`** | `learningPath.js` | `LearningPath`, `LearningPathEvent`, `UserProgress` | — |
| **`media`** | `index.js` (upload + serve) | — | — |
| **`payment`** | `index.js` (entry) | `Order` | `lib/vnpay.js`, `services/paymentFulfillmentService.js` |
| **`rewards`** | `gems`, `showcaseGamification` | `Achievement`, `GemTransaction`, `ShowcaseUnlock`, `UserAchievement`, `UserReward` | `services/rewardEngine.js`, `subscribers/learningPathRewards.js` (event-driven) |

**Quan sát kiến trúc backend:**

- **Cấu trúc nhất quán** trong mỗi feature: `{index.js, routes/, models/, services?, lib?, subscribers?}`. Đây là điểm mạnh nhất của codebase.
- **Event-driven hint**: `services/eventBus.js` + `rewards/subscribers/learningPathRewards.js` cho thấy có cơ chế subscribe cross-feature.
- **`content3d` đặc biệt** — chứa cả "showcase" (vũ trụ) và sub-feature lồng nhau `narrative` (Earth history). Đây là feature lớn nhất.
- **Folder `services/` (top level của API)** chủ yếu `eventBus.js` (infra). Admin/order + teacher-application logic nằm trong `features/admin/services/` và `features/auth/services/` (2026-05).

---

## 1.3 Backend — Python services

### `services/ai` (FastAPI)
```
ai/
├── server.py             ← FastAPI app
├── agent_tools.py        ← AI tutor function-calling tools
├── knowledge_pipeline.py ← ingest pipeline
├── rag.py                ← retrieval-augmented generation
├── security.py           ← API key/auth
├── data/, knowledge/     ← corpus
├── scripts/              ← validate_corpus.py, build_rag_index.py
└── requirements.txt
```

### `services/embedding`
- Một `server.py` + `requirements.txt` + `.venv` — chuyên trách sinh embedding vector.

**Quan sát:** 2 service Python đang **tách rời**. `embedding/` chỉ là provider; `ai/` là consumer + agent. Mô hình này hợp lý nếu embedding được scale độc lập (GPU vs CPU).

---

## 1.4 Frontend — `client/`

Next.js 14 (app router) + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Three.js 0.160 + Firebase 11 + Capacitor 8 (hybrid mobile).

### Top-level

```
client/
├── src/
├── public/                  ← static assets
├── android/                 ← Capacitor Android wrapper
├── capacitor-shell/         ← Capacitor shell (iOS scaffold)
├── docs/                    ← FE-specific docs
├── scripts/                 ← 4 build/check scripts (xem 1.5)
├── DOMAIN_MAP.md            ← spec target FE↔BE
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── capacitor.config.ts
├── tsconfig.json
└── package.json             ← scripts: dev, build, lint, check:boundaries, check:earth-ssot, hybrid:*
```

### `client/src/` — file count theo top-level

| Folder | File count (ts/tsx/css/json/md) | Vai trò |
|---|---|---|
| `components/` | 87 | Presentational + composed UI |
| `app/` | 54 | Next.js routes + layouts + 2 API routes |
| `features/` | 51 | Domain logic (api + stores + hooks + lib) — **canonical** |
| `lib/` | 25 | Cross-cutting helpers + data |
| `design-system/` | 11 | Tokens + primitives + surface CSS (mới sau PR1–PR5) |
| `data/` | 3 | JSON/TS curriculum data |
| `types/` | 2 | Global type aug + d3-force types |
| `messages/` | 1 | i18n VN strings |

> Đã xóa trong session trước: `contexts/` (rỗng), `hooks/` (rỗng).

---

## 1.5 Client scripts

```
client/scripts/
├── check-import-boundaries.mjs   ← CI guard: components/3d không được import @/lib/*Api
├── check-earth-history-ssot.mjs  ← guard SSOT cho earth history (xem DOMAIN_MAP §SSOT policy)
├── copy-paleo-textures.js        ← build-time texture copier
└── export-learning-path-json.ts  ← export curriculum sang JSON
```

Đây là minh chứng kiến trúc đã có **guard tự động**: 2 boundary checker chạy được qua npm script (`check:boundaries`, `check:earth-ssot`). Điểm rất mạnh, ít dự án có.

---

## 1.6 Next.js app router — route map

Tổng **47 page.tsx + 8 layout.tsx + 2 api/route.ts**. Group theo domain:

### Marketing / Auth
- `/` (page.tsx ở root) — landing
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` — auth flow (mỗi page có thể có layout riêng)

### Dashboard area (sau đăng nhập)
- `/dashboard`, `/dashboard/moderate` — dashboard shell (layout dùng `DashboardShell`)
- `/profile`, `/apply-teacher`
- `/gem`, `/gem-shop` — đều wrap bằng `DashboardShell`

### Education (Learning Path - "tutorial")
- `/tutorial` — entry
- `/tutorial/[moduleId]` → `/tutorial/[moduleId]/[nodeId]` → `/tutorial/[moduleId]/[nodeId]/[lessonId]`
- `/tutorial/[slug]` (alt slug-based, có thể là legacy?)
- `/tutorial/knowledge-map` — KnowledgeStarMap
- `tutorial/layout.tsx` — wrap `surface-edu`

### Courses (paid + free)
- `/courses`, `/courses/[slug]`, `/courses/[slug]/learn`, `/courses/[slug]/learn/[lessonSlug]`
- `/my-courses`
- `courses/layout.tsx` — wrap `surface-edu`

### Community / Search / Topics
- `/community`, `/community/[slug]`, `/community/post/[id]`
- `/search`
- `/topics/[slug]`
- `/concepts/[conceptId]` (kernel viewer)

### Studio (authoring tool — admin/teacher)
- `/studio` (hub)
- `/studio/[slug]` (generic editor)
- `/studio/concepts`, `/studio/learning-path`
- `/studio/showcase-entities` + colocated (`narrative/NarrativeStudioEditor`, `ShowcaseEntityPreviewCard`, … — **không** còn `NarrativeStudioMode` generic)
- `/studio/tutorial`, `/studio/tutorial/new`, `/studio/tutorial/[slug]`
- `studio/layout.tsx` — wrap `surface-studio`

### 3D experience (chính)
- `/explore` — 1 page duy nhất, render `EarthScene` + `ShowcaseScene` chuyển mode

### Hệ thống
- `/admin` — admin panel, dùng primitives đã migrate (`@/design-system`)
- `/payment/return` — VNPay callback
- `/offline` — PWA offline fallback
- `/api/chat`, `/api/embed` — Next.js API routes (proxy hoặc edge)

---

## 1.7 `client/src/components` — phân loại

87 file, đã chia theo subfolder. Quan sát từng nhóm:

### `components/3d/` (20 file)
Presentational 3D primitives + 1 sub-folder `showcase/`.
```
3d/
├── Earth.tsx, EarthScene.tsx              ← Earth-specific (geo, fossils, stages)
├── Moon.tsx, OrbitPath.tsx, planetBodies.tsx  ← shared planet primitives
├── orbitProximityFade.ts                  ← shared util
├── FossilPoints.tsx, FossilFocusHighlight.tsx, GeoLabels.tsx, StageHotspots.tsx  ← fossil/geo overlay
├── ExploreEntityFx.tsx                    ← FX layer dùng cho /explore
└── showcase/
    ├── ShowcaseScene.tsx                  ← generic engine (giữ lại sau cleanup 3D)
    ├── ShowcaseEntityLayer.tsx, ShowcaseEntityMesh.tsx, ShowcaseEntityPanel.tsx, ShowcaseModelEntityMesh.tsx
    ├── ShowcaseCameraManager.tsx, ShowcaseLighting.tsx
    └── SHOWCASE_TECH_NOTES.md
```
**Điểm mạnh**: tất cả 20 file này tuân theo boundary rule (không import `@/lib/*Api` hay `@/features/*/api/*` trực tiếp — đã verify bằng `check:boundaries` allowlist trống).

### `components/ui/` (27 file)
Đây là folder hỗn tạp nhất hiện còn — chứa 4 nhóm khác nhau bị gộp chung:

1. **App shell / chrome** (5): `AppChrome`, `AppHeader`, `AppShell`, `MobileBottomNav`, `LayoutChromeContext`, `LayoutChromeBoundary`
2. **System utilities** (7): `ChunkLoadRecovery`, `ErrorBoundary`, `ErrorBoundaryWrap`, `HybridBootstrap`, `PwaRegister`, `PwaInstallPrompt`, `PwaStatusBadge`, `Analytics`
3. **Generic UI atoms** (8): `Loading`, `Spinner`, `Skeleton`, `EmptyState`, `PageHeader`, `SiteLogo` (+ 2 đã chuyển vào `design-system/primitives`: Button, Card, Badge, Input)
4. **Domain-specific 3D/Earth UI** (7): `Controls`, `Timeline`, `InfoPanel`, `FossilPanel`, `FossilDetailOverlay`, `FeaturedOrganisms`, `Organism3DViewer`

**Drift 1.7.A — `components/ui/` đang là "junk drawer"**:
4 nhóm trên thuộc 4 layer concept khác nhau. Theo `DOMAIN_MAP.md` chúng nên ở:
- App shell → `components/layout/` (đã có `DashboardShell` ở đây — nên gom vào)
- System utilities → `components/system/` hoặc `app/_system/`
- Generic atoms → `design-system/primitives/`
- Domain 3D UI → `features/content3d/earth/ui/` (theo target layout của DOMAIN_MAP)

### `components/courses/` (4)
`CourseLandingClient`, `CoursePageClient`, `LessonContentBody`, `QuizLessonBlock` — đều là presentational, consume từ `features/courses/public`.

### `components/learning-path/` (7)
Tương tự — presentational, consume `features/learning-path/public`.

### `components/studio/` (11)
Studio editor UI: `BlockEditor`, `BlockPalette`, `LessonPreview`, `RichTextEditor`, `ModelViewer`, `LearningPathRecallQuizEditor`, `NodeTopicWeightsEditor`, `StageTimePicker` + `blocks/{ChartBlock, MathBlock, SliderBlock}`.

### Các domain UI khác
- `components/auth/` (2) — `AuthProvider`, `FirebaseAuthButtons`
- `components/community/` (5) — News* slider/row/chips, PostMarkdown, NewsCardLink
- `components/landing/` (7) — Hero, CTA, Categories, Courses, Footer, Stats, Testimonials sections
- `components/knowledge/` (1) — `KnowledgeStarMap` (38KB, force-graph 2D)
- `components/ai-tutor/` (3) — `CosmoAssistantWidget`, `AssistantMarkdown`, `parseTutorActions`
- `components/showcase/` (1) — `ShowcaseCatalogProvider` (context provider cho showcase data)
- `components/layout/` (1) — `DashboardShell`

---

## 1.8 `client/src/features` — domain layer (canonical)

10 domain. Tất cả tuân pattern: **`api/`, `lib/`, `stores/?`, `hooks/?`, `public.ts` (barrel)**.

| Domain | api | lib | stores | hooks | public | types |
|---|---|---|---|---|---|---|
| `auth` | `authApi` | — | `useAuthStore` | — | ✓ | ✓ |
| `admin` | `adminAnalyticsApi`, `adminUsersApi`, … | — | — | — | ✓ | — |
| `community` | `communityApi` | `postContent`, `postEngagement` | — | — | ✓ | — |
| `promotions` | `promoCodesApi` | — | — | — | ✓ | — |
| `notifications` | `notificationsApi` | — | — | — | ✓ | — |
| `concepts` | `conceptsApi` | `conceptAnchorsHtml`, `knowledgeGraphData` | — | — | ✓ | — |
| `courses` | `coursesApi` (+ `server.ts` **RSC-only**, không trong `public`) | — | `useTutorContextStore` | — | ✓ | ✓ |
| `learning-path` | `learningPathApi`, `server` (SSR) | `learningPathProgress`, `learningPathBehavior`, `lessonRecallQuiz` | — | `useLearningPath` | ✓ | — |
| `payment` | `paymentApi` | — | — | — | ✓ | — |
| `rewards` | `gemsWalletApi`, `showcaseGamificationApi` | `gemWallet` | — | — | ✓ | — |
| `content3d/earth` | `earthApi`, `earthHistoryApi` | `earthHistoryData` (SSOT) | `sceneCommandStore`, `playbackStore` | — | ✓ | — |
| `content3d/narrative` | `planetNarrativeApi`, panel-schema, adapters | beat/globe helpers | `planetNarrativeStore` | — | ✓ | ✓ (planet beats; **không** còn generic narrative-space) |
| `content3d/showcase` | `showcaseCatalogApi`, `showcaseEntitiesApi`, `showcaseOrbitsApi` | `showcaseLearningBridge` | `showcaseStore` | — | ✓ | ✓ |
| ~~`content3d/context`~~ | — | — | — | — | **Removed** | — |

**Điểm mạnh**: alignment 1:1 với backend `services/api/features/*` (cùng tên domain). Đây là điểm thiết kế quan trọng nhất của dự án.

**Drift 1.8.A**: ~~4 domain thiếu `public.ts`~~ — **Partial 2026-05**: `admin`, `community`, `payment`, `promotions`, `notifications` đã có barrel; `app/` enforce `public` qua `check:app-public`. **Còn**: `components/` và một số `studio/*` vẫn import sâu `*/api/*` (§2.5).

**Drift 1.8.B**: `narrative` đặc biệt — không nằm trong `api/` mà có nhiều file ngang cấp (`hooks.ts`, `selectors.ts`, `service.ts`, `store.ts`). Inconsistent với pattern còn lại. **Resolved by Drift 3.6.E** (toàn bộ folder `narrative/` bị xoá).

---

## 1.9 `client/src/lib` — sau dọn dẹp

22 file (giảm từ 30 sau đợt cleanup gần nhất). Giờ chỉ chứa **shared utilities/data**, không còn shim:

| Nhóm | File |
|---|---|
| **Cross-cutting infra** | `apiConfig`, `cn`, `analytics`, `firebaseClient`, `roles`, `navigationConfig` |
| **Geo / data util** | `geo`, `geoPlaces`, `ssrStableRandom` |
| **Domain-data thuần (chưa thuộc feature nào)** | `solarSystemData`, `solarOrbitMath`, `solarJourneyProgress`, `iconicOrganisms`, `fossilPhyla`, `paleoTextureMap`, `planetTextureQuality`, `stageHotspots`, `topicPathMapping` |
| **Showcase merge logic (cross feature)** | `showcaseEntities`, `mergeShowcaseCatalog` |
| **Community helpers** | `postContent`, `postEngagement` |

**Drift 1.9.A**: `iconicOrganisms`, `fossilPhyla`, `paleoTextureMap`, `stageHotspots`, `solarSystemData`, `solarOrbitMath` đều là **3D Earth/Showcase domain data** — theo `DOMAIN_MAP.md` chúng nên nằm dưới `features/content3d/earth/lib/` hoặc `features/content3d/showcase/lib/`. Để ở `lib/` chỉ vì lý do tree-shake / SSR-safe (đã ghi trong DOMAIN_MAP §"Pragmatic exception").

**Drift 1.9.B**: `solarJourneyProgress.ts` còn ở `lib/`, nhưng cũng chỉ phục vụ rewards/dashboard — có thể chuyển sang `features/rewards/lib/`.

**Drift 1.9.C**: `postContent` + `postEngagement` thuộc community — nên ở `features/community/lib/`.

---

## 1.10 Design system (sau PR1–PR5)

```
client/src/design-system/
├── README.md                         ← spec 3 layer
├── index.ts                          ← public barrel: { Button, Card, Badge, Input, tokens }
├── tokens/
│   ├── primitive.ts                  ← raw scales (space, radius, duration, easing) làm TS const
│   ├── semantic.css                  ← :root --color-bg-base, --color-accent, ...
│   └── surfaces/
│       ├── edu.css                   ← .surface-edu override (purple, comfortable density)
│       ├── studio.css                ← .surface-studio override (teal, compact density)
│       └── scene.css                 ← .surface-scene override (per-planet accent, glassmorphism)
└── primitives/
    ├── Button.tsx, Card.tsx, Badge.tsx, Input.tsx
```

**Tích hợp**:
1. `tailwind.config.ts` mở rộng theme với `ds-*` utilities (`bg-ds-base`, `text-ds-accent`, `border-ds-border`, `rounded-ds-control`, `duration-ds-fast`, ...).
2. `app/globals.css` import 4 file CSS theo thứ tự: `semantic.css` → 3 surface files. Tất cả nằm **trên** `@tailwind` directives để hợp lệ với PostCSS.
3. Layout per-area apply class `surface-edu | surface-studio | surface-scene`:
   - `app/courses/layout.tsx`, `app/tutorial/layout.tsx` → `surface-edu`
   - `app/studio/layout.tsx` → `surface-studio`
   - 3D scenes apply `surface-scene` inline khi mount overlay
4. `@layer components { .studio-field {...} }` được inline vào `globals.css` (vì PostCSS xử lý `@import` thành unit độc lập, không thấy `@tailwind components`). Comment giải thích đầy đủ.

**Điểm mạnh**: đây là **layer mới + sạch nhất** trong codebase, hoàn toàn tuân spec.

**Drift 1.10.A**: `design-system/primitives/` mới chỉ có 4 component (Button, Card, Badge, Input). Theo spec 3-layer (DOMAIN_MAP + design-system README), còn thiếu: `Dialog`, `Tabs`, `Tooltip`, `Select`, `Popover`, `Toast`, `Slider`, `Progress`, `Command`. Hiện tại các page đang inline implement bằng Tailwind class trực tiếp.

---

## 1.11 State management

Zustand (4.5). Tất cả store nằm trong `features/<domain>/stores/`:

| Store | Domain | Vai trò |
|---|---|---|
| `useAuthStore` | auth | user, token, checked, loading |
| `useTutorContextStore` | courses | AI tutor context (general/course mode) |
| `sceneCommandStore` | content3d/earth | imperative commands tới 3D scene (focusPlanet, playStage) |
| `playbackStore` | content3d/earth | timeline playback state |
| `showcaseStore` | content3d/showcase | discovery map, visited entities, learning bridge state |
| ~~narrative `store`~~ | ~~content3d/narrative~~ | _xoá ở Drift 3.6.E — thay bằng `content3d/earth/stores/earthHistoryStore`_ |

**Quan sát**: 6 store, mỗi store **scope rõ ràng theo domain**. Không có "global app store" — đúng pattern Zustand.

**Drift 1.11.A**: `narrative` store là duy nhất không nằm trong `stores/` mà nằm thẳng `features/content3d/narrative/store.ts`. Inconsistent. **Resolved by Drift 3.6.E** (store renamed `earthHistoryStore.ts` đặt đúng `earth/stores/`).

---

## 1.12 Dependencies (chỉ điểm các quyết định lớn)

- **3D**: `three@0.160`, `@react-three/fiber@8.15`, `@react-three/drei@9.96` — version cũ (current là three@0.165+, R3F 9.x). Hiện ổn vì đã hardcode types `@types/three@0.160`.
- **UI prim**: `framer-motion@12.36`, `lucide-react@0.577`, `clsx@2.1`, `tailwind-merge@2.2` — đầy đủ cho design system layer 2.
- **Editor**: 13 `@tiptap/*` packages cho RichTextEditor (studio).
- **Markdown**: `react-markdown@10`, `remark-gfm@4`.
- **Math/code**: `katex@0.16`, `lowlight@3.3` (code highlight cho Tiptap).
- **Charts**: `recharts@3.8`.
- **Graph**: `d3-force@3`, `react-force-graph-2d@1.25` cho `KnowledgeStarMap`.
- **Auth + storage**: `firebase@11.10` (client), `zustand@4.5`.
- **Hybrid**: 7 `@capacitor/*@8` packages cho mobile app wrapper.
- **Next**: `next@14.2.0` — không phải 14.2.35 như log dev hiển thị "outdated", nhưng vẫn 14.x major.

**Drift 1.12.A**: `next@14.2.0` đã outdated (Next 15 GA). Nâng major sẽ động vào app router behavior + React 19 — task lớn.

**Drift 1.12.B**: `eslint-config-next@14.2.0` + `next@14.2.0` ăn khớp. Không vấn đề.

---

## 1.13 Build pipeline

```
client/package.json → next build (default)
client/scripts/check-import-boundaries.mjs   ← chưa hook vào CI tự động (chỉ chạy thủ công)
client/scripts/check-earth-history-ssot.mjs  ← tương tự
.github/                                     ← chưa kiểm tra workflow nội dung
```

**Drift 1.13.A**: 2 boundary script đã viết nhưng **không gọi tự động** trong `prebuild`/`postinstall`/CI. Cần thêm vào `.github/workflows/` hoặc package.json `scripts.prebuild`.

---

# Tóm tắt Part 1

**Cấu trúc tổng**: monorepo 3 tầng — `client/` (Next.js FE) + `services/{api,ai,embedding}` (BE) + `packages/auth-shared` (shared JS).

**Backend**: 11 bounded contexts trong `services/api/features/*`, pattern `{routes, models, services?, lib?, subscribers?}` rất nhất quán. Có event bus + scheduled scripts.

**Frontend**: layered theo DOMAIN_MAP spec — `features/<domain>/` là canonical, `components/` là presentational, `lib/` chỉ shared util, `design-system/` là token + primitive layer, `app/` là route/layout. Mapping FE↔BE 1:1 ở tên domain.

**13 drift đã liệt kê** (Part 1.1–1.13), chia thành 4 nhóm:
- **Critical**: workspace mojibake/secrets (1.1, 1.2)
- **Architectural drift**: `components/ui/` junk drawer (1.7.A), 4 domain thiếu `public.ts` (1.8.A), domain data còn nằm `lib/` (1.9.A–C)
- **Inconsistency**: narrative store/api layout (1.8.B, 1.11.A)
- **Tooling gap**: design system primitives chưa đủ (1.10.A), boundary script chưa hook CI (1.13.A), Next major outdated (1.12.A)

---

# PART 2 — Domain layering & cách liên kết (FE ↔ BE)

Phần này trả lời: **luồng dữ liệu thật** từ `app/` và `components/` đi qua layer nào, có tuân `client/DOMAIN_MAP.md` không, và chỗ nào **drift** (import sâu, domain chết, boundary checker sai phạm vi).

## 2.1 Quy tắc mục tiêu (tóm tắt từ `DOMAIN_MAP.md`)

| Layer | Vai trò | Quy tắc import |
|---|---|---|
| **`app/`** | Route + layout + orchestration mỏng | Gọi `features/<domain>/public` + `lib/` shared. **Không** nhân bản fetch đã có trong `features/*/api/`. |
| **`features/<domain>/`** | Domain: `api/` (fetch), `hooks/`, `stores/`, `lib/`, `public.ts` (barrel) | Domain A → domain B **chỉ** qua `features/<B>/public` (ngoại lệ type-only từ `lib/` đã ghi trong DOMAIN_MAP). |
| **`components/`** | UI presentational | Nhận props / gọi hook từ parent; **không** import `features/*/api/*` nếu là `components/3d/**` (guard script). |
| **`lib/`** | Pure shared (không domain) | **Không** import `features/*`. |
| **`design-system/`** | Token + primitive | Không import feature. |

---

## 2.2 Bảng mount API backend ↔ frontend domain (đối chiếu thực tế)

Backend (`services/api/features/*`) đã mount REST theo bounded context; frontend domain folder **trùng tên** với backend (trừ `content3d` gom nhiều mount). Đây là alignment cốt lõi — vẫn đúng sau audit.

| Backend mount (ước lượng từ routes) | Frontend `features/` | Ghi chú thực tế |
|---|---|---|
| `/api/auth/*` | `auth` | `authApi` + `useAuthStore` + nhiều page import **sâu** `authApi` (xem §2.4). |
| `/api/courses/*`, tutorials | `courses` | `coursesApi`, `server.ts` SSR; studio + courses pages import sâu. |
| `/api/learning-path/*` | `learning-path` | `public` + `learningPathApi`; phần lớn tutorial/studio dùng `public`. |
| `/api/concepts/*` | `concepts` | `public` + `conceptsApi`; studio concepts + learning-path page dùng `public`. |
| `/api/showcase-*`, orbits, catalog | `content3d/showcase` | `showcase/public` + **nhiều** import sâu `showcaseEntitiesApi`, `showcaseOrbitsApi`, `showcaseCatalogApi`. |
| `/api/narrative-spaces/*`, earth-history, fossils | `content3d/narrative` + `content3d/earth` | Narrative store + earth stores; `earthApi` / `earthHistoryApi`. |
| `/api/gems/*`, gamification | `rewards` | `rewards/public` dùng tốt ở dashboard/gem. |
| `/api/payments/*` | `payment` | **Không có `payment/public.ts`** — mọi nơi import `@/features/payment/api/paymentApi`. |
| `/api/posts/*`, forums, news | `community` | **Không có `community/public.ts`** — page + components import `communityApi` trực tiếp. |
| `/api/admin/*` (analytics) | `admin` + `lib/analytics` | **Drift nghiêm trọng**: `features/admin/api/adminAnalyticsApi.ts` chỉ re-export từ `@/lib/analytics/reporting/admin` nhưng **toàn bộ `src/` không có file nào import `features/admin`** — `app/admin/page.tsx` import thẳng `@/lib/analytics/reporting/admin`. Folder `features/admin/` gần như **chết**. |

---

## 2.3 Ma trận route (`app/`) → nguồn dữ liệu

Cột **Nguồn** = nơi page lấy dữ liệu (public barrel vs `*/api/*` vs `lib/`).

| Route / file | Domain chính | Nguồn (import) | Tuân DOMAIN_MAP? |
|---|---|---|---|
| `page.tsx` (landing) | courses | `features/courses/server` | ✓ RSC entry server-only (tách khỏi `public` — tránh client bundle). |
| `login`, `register`, `forgot-password`, `reset-password`, `auth/callback` | auth | `authApi` + `auth/public` + `lib/{apiConfig,ssrStableRandom,analytics}` | ⚠ `app` import sâu `authApi` (DOMAIN_MAP: “app may use api for auth actions” — **gray zone**, có thể chấp nhận). |
| `apply-teacher`, `profile` | auth | `authApi` + `auth/public` | ⚠ tương tự |
| `dashboard/page.tsx` | learning-path + rewards + lib | `learning-path/public`, `rewards/public`, `lib/solarJourneyProgress` | ⚠ solar journey là **client-side progress** nằm `lib/` — nên thuộc `rewards` hoặc `learning-path` theo product. |
| `dashboard/moderate` | auth + lib | `auth/public`, `lib/roles` | ✓ |
| `courses/page.tsx` | courses | `courses/public` | ✓ |
| `courses/[slug]/page.tsx`, `.../learn/...` | courses | `courses/server` (SSR) + client qua `public` | ✓ |
| `my-courses` | courses + payment + learning-path | `courses/public`, `payment/public`, `learning-path/public` | ✓ |
| `search/page.tsx` | courses + learning-path | `courses/public`, `learning-path/public` | ✓ |
| `tutorial/**` | learning-path | `learning-path/public` | ✓ |
| `studio/page.tsx`, `studio/[slug]` | courses + auth | `courses/public`, `auth/public` | ✓ |
| `studio/concepts`, `studio/learning-path` | concepts + learning-path + courses + showcase | `concepts/public`, `learning-path/public`, type từ `coursesApi`, `showcaseEntitiesApi`, `lib/showcaseEntities`, `lib/mergeShowcaseCatalog` | ⚠ nhiều lớp + `lib` cho catalog merge |
| `studio/showcase-entities` (+ colocated TSX) | showcase + auth + learning-path + narrative + courses | `showcaseEntitiesApi`, `showcaseOrbitsApi`, `lib/*`, `auth/public`, `learning-path/public`, `narrative/public`, `coursesApi` (upload) | ⚠ orchestrator rất dày — đúng bản chất studio nhưng vi phạm “page mỏng” |
| `explore/` (thin `page.tsx` + `ExplorePageContent`) | content3d + learning-path + rewards + auth | `explore/hooks/*` → `earth/public`, `narrative/public`, `showcase/public`, `learning-path/public`, `rewards/public` | ✓ orchestrator tách module; catalog merge trong `useExploreShowcaseCatalog` + `lib/` pragmatic |
| `community/*` | community + auth | `community/public`, `auth/public` | ✓ |
| `admin/page.tsx` | admin + auth + courses + payment | `admin/public`, `auth/public`, `payment/public` | ✓ |
| `gem/page.tsx` | rewards + auth | `rewards/public`, `auth/public` | ✓ |
| `payment/return` | (tracking) | `lib/analytics` | ✓ cross-cutting |
| `layout.tsx` | infra | `lib/apiConfig` | ✓ |

**Kết luận §2.3 (2026-05)**: `app/` đã chuẩn hoá **`features/*/public`** cho hầu hết route (enforce CI). **Ngoại lệ có chủ đích**: RSC pages import `features/courses/server` (và tương tự có thể cần `learning-path/server` sau này). **Orchestrator nặng** chuyển sang `app/explore/hooks/` thay vì một `page.tsx` khổng lồ. Studio `showcase-entities` vẫn hybrid (nhiều API + `lib/` merge).

---

## 2.4 `app/` import sâu `features/*/api/*` — **resolved 2026-05 (app routes)**

**Trước:** hàng chục `app/**` import thẳng `*/api/*`.

**Hiện tại:** `node scripts/check-app-public-imports.mjs` — **0 violation** trên `client/src/app/`. Barrel mở rộng (`admin`, `community`, `payment`, `promotions`, `notifications`, `courses`, `showcase`, …).

**Ngoại lệ RSC (không vi phạm guard):** Server Components import `features/courses/server` (không qua `public` — cố ý tách `server-only`).

**Còn nợ liên quan (không nằm trong `app/`):** `studio/showcase-entities/*`, `studio/learning-path/*` vẫn có thể import sâu showcase/courses API — xem §2.5; không bị `check-app-public` quét.

---

## 2.5 `components/` import sâu vào `features/*/api/*`

Các file **không** phải `components/3d/**` nhưng vẫn import API trực tiếp (presentational layer gắn chặt DTO):

| File | Import |
|---|---|
| `components/courses/{CourseLandingClient,CoursePageClient,LessonContentBody,QuizLessonBlock}.tsx` | `courses/api/coursesApi`; `CoursePageClient` + `createPayment` → `payment/api/paymentApi` |
| `components/studio/*` (BlockEditor, BlockPalette, LessonPreview, blocks) | `courses/api/coursesApi` (types + upload) |
| `components/auth/{AuthProvider,FirebaseAuthButtons}.tsx` | `auth/api/authApi` |
| `components/ui/AppHeader.tsx` | `auth/api/authApi` (`clearToken`) |
| `components/community/News*.tsx`, `NewsCardLink.tsx` | `community/api/communityApi` (type `Post`) |
| `components/landing/CoursesSection.tsx` | type `Course` từ `coursesApi` |
| `components/showcase/ShowcaseCatalogProvider.tsx` | `showcase/api/showcaseCatalogApi` |
| `components/3d/showcase/ShowcaseEntityPanel.tsx` | type từ `showcaseEntitiesApi` |
| `components/ui/FossilPanel.tsx` | `earth/api/earthApi` (`searchFossils`) |
| ~~`components/3d/EarthScene.tsx`~~ | ~~`earth/api/earthApi`~~ → **resolved** — fossil fetch qua `earth/hooks/useStageFossils`; parent/orchestrator truyền props |

**Drift 2.5.A — EarthScene fetch** — ✅ **Resolved 2026-05**  
Regex boundary script đã bắt nested `features/content3d/*/api/*`; `ShowcaseScene` dùng type từ `showcase/public`. Allowlist **rỗng**; `npm run check:boundaries` PASS.

---

## 2.6 Domain chết / stub chưa dùng — **resolved 2026-05**

| Path | Trạng thái |
|---|---|
| `features/admin/api/adminAnalyticsApi.ts` | **Canonical implementation** (moved from `lib/analytics/reporting/admin`); consumed via **`admin/public`** (`app/admin/page.tsx`). |
| `features/content3d/context/api/content3dContextApi.ts` | **Removed** — no client file; Earth/planet paths documented in `services/api/features/content3d/README.md`. |

---

## 2.7 Liên kết cross-feature (feature → feature)

Grep các import `from '@/features/` bên trong `client/src/features/` (ngoại lệ barrel nội bộ):

| Từ | Đến | Ghi chú |
|---|---|---|
| `learning-path/hooks/useLearningPath.ts` | `learning-path/api/learningPathApi` | ✓ nội bộ domain |
| `courses/api/server.ts` | `courses/api/coursesApi` | ✓ nội bộ |
| `auth/stores/useAuthStore.ts` | `auth/api/authApi` (type) | ✓ nội bộ |
| `rewards/lib/gemWallet.ts` | `rewards/api/gemsWalletApi` | ✓ nội bộ |
| `content3d/narrative/lib/legacyPresets.ts` | `earth/public` (`earthHistoryData`) | ✓ SSOT qua barrel |
| `content3d/earth/stores/sceneCommandStore.ts` | `earth/api/earthApi` (type / dynamic import) | ✓ nội bộ sub-domain |
| `content3d/narrative/public.ts` | `planetNarrativeApi`, adapters | ✓ planet beats (không còn narrative-spaces API) |

Generic **narrative-space** wrapper đã xoá (Drift 3.6.E); cross-link còn lại là earth SSOT ↔ planet-narrative adapters.

---

## 2.8 `lib/` được `app/` + `components/` gọi như thế nào (tách khỏi “shared thuần”)

Ngoài `apiConfig`, `roles`, `analytics` (đúng shared), các `lib/*` **mang nghĩa domain** vẫn được route/pages gọi trực tiếp:

- `explore/hooks/useExploreShowcaseCatalog` + `studio/*`: `showcaseEntities`, `mergeShowcaseCatalog`, `solarSystemData` (pragmatic `lib/`)
- ~~`dashboard`: `solarJourneyProgress`~~ → `rewards/lib` (PR10)
- ~~`community`: `postContent`, `postEngagement`~~ → `community/lib` (PR10)

Điều này **khớp** phần “Remainder” trong DOMAIN_MAP (merge NASA + solar data ở `lib/`), nhưng vẫn là điểm mở rộng: nếu muốn barrel sạch, nên wrap trong `showcase/public` re-export.

---

## 2.9 Tóm tắt Part 2 — “vấn đề hiện tại” ở lớp liên kết (2026-05)

1. ~~**`app/` import sâu `*/api/*`**~~ — **Done** (`check:app-public`).
2. ~~**admin/context dead stub**~~ — **Done** (§2.6).
3. ~~**3D boundary false negative + EarthScene fetch**~~ — **Done** (§2.5.A).
4. ~~**Explore orchestrator một file ~1k dòng**~~ — **Done** (`app/explore/README.md`).
5. **Còn mở:** `components/` (courses, studio, community, auth, landing) vẫn import sâu `*/api/*` — §2.5; codemod hoặc mở rộng guard.
6. **Còn mở:** `studio/showcase-entities` orchestrator dày; `learning-path/public` vẫn `export *` từ `api/server` (rủi ro tương tự courses nếu client import nhầm).
7. **Còn mở:** `courses/server` pattern — document trong DOMAIN_MAP; có thể áp dụng cho `learning-path/server` nếu cần.

---

# PART 3 — Cross-cutting wiring

Phần này nhìn ngang qua tất cả route — cùng các *system thẳng đứng* (design system, state, API base, auth, 3D, PWA/Capacitor) — để hiểu **lúc app chạy, các mảnh ghép gắn vào nhau ra sao**.

## 3.1 `app/layout.tsx` — root tree & ownership

```
RootLayout
└─ <html lang="vi"><body>
   ├─ Suspense → Analytics                         (lib/analytics)
   ├─ ChunkLoadRecovery                            (window.error → reload 1 lần)
   ├─ PwaRegister                                  (navigator.serviceWorker.register('/sw.js'))
   ├─ HybridBootstrap                              (Capacitor: appUrlOpen, networkStatus, hydrate token)
   └─ AuthProvider                                 (đọc token → setUser → cache useAuthStore)
      └─ ShowcaseCatalogProvider                   (fetch showcase catalog 1 lần, expose qua context + gen counter)
         └─ LayoutChromeProvider                   (state {showHeader, showMobileNav, showStarfield})
            └─ ErrorBoundaryWrap
               ├─ PwaInstallPrompt
               ├─ PwaStatusBadge
               ├─ AppChrome                        (đọc useLayoutChrome → AppHeader + AppShell)
               │  └─ AppShell                      (starfield overlay + MobileBottomNav)
               │     └─ {children}                 (route segment)
               └─ Suspense → CosmoAssistantWidget    (global FAB; portal z-index 1001)
```

**Quan sát**:
- `AuthProvider` + `ShowcaseCatalogProvider` cùng đứng *trên* `AppChrome` → mọi route đều có đủ user + showcase catalog ngay khi mount, không phải refetch theo route.
- **`CosmoAssistantWidget`** mount **toàn cục** ngoài `AppChrome` → AI luôn sẵn ở mọi page (kể cả 3D/explore). Ngữ cảnh LP/Explore qua `AgentPageProvider`; course qua `useTutorContextStore` + `buildSessionContext` (xem §3.4).
- `LayoutChromeProvider` + `LayoutChromeBoundary` là pattern rõ ràng: **route con khai báo "tôi cần ẩn header/nav"**, root layout đáp ứng. Đang dùng ở `app/{login,register,admin,studio}/layout.tsx`.

**Drift 3.1.A — `LayoutChromeBoundary` thiếu cho area edu/courses/tutorial**: Edu surfaces hiện chỉ wrap `surface-edu` mà không truyền options layout chrome. Nếu sau này muốn “explore mode” ẩn header → cần thêm `LayoutChromeBoundary` giống `studio/layout.tsx`.

---

## 3.2 Design system — chuỗi áp dụng thực tế

Pipeline đầy đủ:

```
tailwind.config.ts            content: ['./src/{app,components,design-system}/**']
                              theme.extend.colors → { ds-base, ds-surface, ds-accent, ... }
                              theme.extend.borderRadius → { ds-card, ds-control, ds-chip }
                              theme.extend.transition* → { ds-fast, ds-base }
                              + giữ legacy {background, foreground, primary, ...} cho marketing surface
                              + earth.*, fossil.* (palette domain 3D)
                                 │
app/globals.css               1. @import font + 4 file design-system/tokens (semantic + 3 surface)
                              2. @tailwind base/components/utilities
                              3. @layer components { .studio-field { @apply ... } }   ← studio input shared
                              4. :root { --cosmic-* } cho landing legacy
                              5. body global + custom scrollbar + ...
                                 │
design-system/
  tokens/semantic.css         :root { --color-bg-base, --color-accent, --radius-card, --motion-* }
  tokens/surfaces/edu.css     .surface-edu { override màu cyan-400 + density Edu }
  tokens/surfaces/studio.css  .surface-studio { teal-400 + density compact }
  tokens/surfaces/scene.css   .surface-scene { glass bg + var(--planet-accent) }
  primitives/{Button,Card,Badge,Input}.tsx   ← consume `bg-ds-*`, `border-ds-*`, `rounded-ds-*`
                                 │
app/<surface>/layout.tsx      <div className="surface-edu | surface-studio">{children}</div>
                                 │
components/3d/...             ← LẼ RA wrap surface-scene tại overlay, NHƯNG không có file nào dùng
```

**Drift 3.2.A — `surface-scene` không được apply ở đâu**  
Grep toàn `client/src` cho `surface-scene` hoặc `--planet-accent`: **0 match** ngoài file định nghĩa CSS. Nghĩa là 3D overlay panels hiện vẫn dùng màu hardcode hoặc semantic mặc định, không nhận accent động per planet. Spec 3-layer chưa đến lớp 3 cho 3D — tài sản tokens hiện vẫn “chờ tiêu thụ”.

**Drift 3.2.B — Hai hệ màu song song**  
`tailwind.config.ts` đồng thời giữ:
- Legacy `cosmic-*` (HSL → `hsl(var(--cosmic-x))` → `bg-background`, `text-foreground`, `border`, `accent`, ...) — phục vụ marketing/landing.
- `ds-*` (CSS var → `bg-ds-base`, ...) — phục vụ product surfaces.

Các file `landing/*` vẫn dùng class kiểu `bg-background border` → ăn vào `cosmic-*`. Đây là **chủ đích** (marketing không chia surface), nhưng cần ghi rõ: **không có** lớp landing theo spec; nếu landing đổi màu, đụng hai chỗ (Tailwind root + `:root` block). Có thể chuyển landing sang một surface riêng (`surface-marketing`) để chỉ một nơi quy định màu.

**Drift 3.2.C — Density tokens chưa được component hoá**  
`semantic.css` định nghĩa `--density-pad-x`, `--density-pad-y`, `--density-content`, `--density-gap` và mỗi surface override. Nhưng **`tailwind.config.ts` không expose** các biến này như utility (không có `p-ds-x`, `gap-ds-content`...). Primitives `Button/Card/Input` cũng dùng `p-3`, `px-3 py-2` cứng. → spec “density per surface” mới *có dữ liệu* mà chưa *có cơ chế tiêu thụ*.

**Drift 3.2.D — Primitives mới có 4/13 component**  
Spec đề xuất Button/Card/Badge/Input + Dialog/Tabs/Tooltip/Select/Popover/Toast/Slider/Progress/Command. Hiện 4 trên — phần còn lại các page tự dựng tay với Tailwind.

---

## 3.3 State management — sơ đồ store (2026-05)

7 Zustand store (sau Drift 3.6.E + planet narrative). Mỗi store **không** import store khác:

| Store | Module | Owner write | Consumer read |
|---|---|---|---|
| `useAuthStore` | `features/auth/stores` | `AuthProvider` | `app/*`, `AppHeader`, … |
| `useTutorContextStore` | `features/courses/stores` | course learn pages | `CosmoAssistantWidget` (root) |
| `useEarthHistoryStore` | `features/content3d/earth/stores` | `loadStages`, timeline | `InfoPanel`, `Timeline`, `Controls`, lessons (`findStageByTime`) |
| `useSceneCommandStore` | `features/content3d/earth/stores` | fossils, phylum, UI flags | `EarthScene`, `FossilPanel`, `FossilDetailOverlay`, … |
| `usePlaybackStore` | `features/content3d/earth/stores` | `Controls` / Timeline | `EarthScene`, `Controls` |
| `usePlanetNarrativeStore` | `features/content3d/narrative/stores` | `app/explore` (`loadForEntity`), studio planet editor | `PlanetHistoryScene`, `NarrativeTimeline`, `NarrativeInfoPanel`, `NarrativeControls` |
| `useShowcaseStore` | `features/content3d/showcase/stores` | preload group, camera helpers | `ShowcaseScene`, `ShowcaseEntityLayer`, `app/explore` |

**Đã xoá (không còn trong repo):** `useNarrativeStore`, `NarrativeStudioMode.tsx`, tab narrative-space trong studio entities (Drift 3.6.E).

**Quan sát**:
- Earth timeline SSOT = `useEarthHistoryStore` + `/api/earth-history` (không qua generic narrative wrapper).
- Planet deep-history = `usePlanetNarrativeStore` + `/api/planet-narratives` (Mars, studio CMS beats).
- `useTutorContextStore` + global **`CosmoAssistantWidget`** — domain `features/agent` + `components/ai-tutor` (xem `docs/plans/learning-agent-system.md` §4.1).

**Drift 3.3.B — Store call API trực tiếp**  
`sceneCommandStore.loadPhylumMetadata` dynamic import `earth/api/earthApi` ngay trong action; **mới**: `earthHistoryStore.loadStages` cũng gọi `earth/api/earthHistoryApi` trực tiếp (đã đơn giản hoá chain so với narrative trước đây). Pattern này phá nguyên tắc "store chỉ giữ state" nhưng được giữ lại cho ergonomics — giảm boilerplate cho consumer page. Ghi nhận để biết shape.

---

## 3.4 API client / env — single source

Toàn bộ API base URL đi qua `lib/apiConfig.ts`:

| Helper | Mục đích | Env phụ thuộc |
|---|---|---|
| `getApiBase()` | root host | `NEXT_PUBLIC_API_BASE_URL` |
| `getAuthBase()` | mặc định `/auth/*` | `NEXT_PUBLIC_API_BASE_URL` || `NEXT_PUBLIC_AUTH_URL` |
| `getApiPathBase()` | `${root}/api` | + fallback `NEXT_PUBLIC_COURSES_URL`, `NEXT_PUBLIC_API_URL` |
| `getEarthHistoryApiPathBase()` | có thể trỏ host khác cho earth-history | `NEXT_PUBLIC_EARTH_HISTORY_API_URL` (option) |
| `getMediaBase()` | `/upload`, `/files` | `NEXT_PUBLIC_API_BASE_URL` || `NEXT_PUBLIC_MEDIA_URL` |
| `getMediaCdnBase()` / `getStaticAssetUrl()` / `resolveMediaUrl()` | static asset CDN | `NEXT_PUBLIC_MEDIA_CDN` |

→ Đây là điểm **rất sạch** — mọi `features/*/api/*.ts` đều bắt đầu bằng `const BASE = getApiPathBase()` (hoặc `getAuthBase()`), không có file feature nào tự đọc `process.env`. Đối chiếu DOMAIN_MAP ✓.

**Quan sát**: Vẫn còn nhiều env legacy (`NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_COURSES_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MEDIA_URL`, `NEXT_PUBLIC_EARTH_HISTORY_API_URL`) chỉ tồn tại làm fallback. Nếu deploy hiện tại chỉ dùng 1 env unified → có thể dọn fallback chains, nhưng thận trọng vì có thể vẫn cần cho `.env.local.example`.

---

## 3.5 Auth lifecycle — chuỗi đầy đủ

```
1. User mở web/PWA
   ├─ HybridBootstrap (nếu native) → hydrateTokenToLocalStorage()  (Capacitor Preferences → window.localStorage)
   └─ AuthProvider mount
      ├─ getToken() = localStorage[galaxies_token]
      ├─ Nếu có token: getUserFromStoredToken() (decode JWT payload base64) → setUser(hydrated)
      ├─ Background fetchMe() → /auth/me   (verify server-side, refresh role)
      │   ├─ success → setUser(serverUser)
      │   └─ fail → clearToken() + setUser(null)
      └─ visibilitychange → khi tab visible lại, refetch fetchMe() cho user còn tươi
2. Login flow
   ├─ Email/pass: login(email, pwd) → setToken(jwt) + setSecureToken (Capacitor) → setUser(serverUser)
   └─ Firebase social: signInWithPopup → loginWithFirebaseIdToken(idToken) → ... (cùng store)
3. Logout
   └─ AppHeader sign-out: clearToken() + setUser(null)
4. Token consumed by every features/*/api/*.ts qua header Authorization: Bearer ${getToken()}
```

**Drift 3.5.A — `authApi.ts` đa nhiệm**  
File `features/auth/api/authApi.ts` chứa 3 nhóm hàm khác nhau:
- **Auth core**: `login`, `register`, `loginWithFirebaseIdToken`, `forgotPassword`, `resetPassword`, `fetchMe`, `updateProfile`, `changePassword`, `deactivateMyAccount`, `setToken/getToken/clearToken`, `getUserFromStoredToken`
- **Admin user mgmt**: `fetchAdminUsers`, `updateUserRole`, `updateUserStatus`
- **Teacher application**: `submitTeacherApplication`, `fetchMyTeacherApplicationStatus`, `fetchAdminTeacherApplications`, `reviewTeacherApplication`

Theo backend `services/api/features/`, admin user mgmt + teacher application **lẽ ra** thuộc `features/admin/` (admin) hoặc `features/auth/api/teacherApplicationsApi.ts` (riêng). Hiện gộp hết vào `authApi.ts` → `app/admin/page.tsx` import 6 hàm admin từ `auth/api/authApi`, tăng coupling auth↔admin.

**Drift 3.5.B — Token bí danh trùng hai nơi**  
`TOKEN_KEY = 'galaxies_token'` định nghĩa cứng cả ở `authApi.ts` và `lib/hybrid/mobileNative.ts` (`SECURE_TOKEN_KEY`). Đổi tên trong 1 chỗ là vỡ.

---

## 3.6 3D scene ownership

Sau cleanup, 3D content có **2 scene engine sống**:

| Engine | File | Domain | Mount | State store |
|---|---|---|---|---|
| **Earth** | `components/3d/EarthScene.tsx` | Earth timeline + fossils (presentational) | `/explore`, course lessons | `useEarthHistoryStore`, `useSceneCommandStore`, `usePlaybackStore` |
| **Planet history** | `components/3d/PlanetHistoryScene.tsx` | Planet narrative globe | `/explore` (`?history=1`) | `usePlanetNarrativeStore` |
| **Showcase** | `components/3d/showcase/ShowcaseScene.tsx` | Solar system catalog | `/explore` (default mode) | `useShowcaseStore` |

Dynamic import từ `app/explore/components/ExploreSceneCanvas.tsx` (`ssr: false`).

**Sub-tree tài sản**:
- Earth: `Earth`, `Moon`, `OrbitPath`, `FossilPoints`, `FossilFocusHighlight`, `GeoLabels`, `StageHotspots`, `ExploreEntityFx`, `planetBodies`, `orbitProximityFade`
- Showcase: `ShowcaseEntityLayer`, `ShowcaseEntityMesh`, `ShowcaseEntityPanel`, `ShowcaseModelEntityMesh`, `ShowcaseCameraManager`, `ShowcaseLighting`

**Catalog data flow** (cross-cutting cho cả 2 mode):
```
ShowcaseCatalogProvider (root layout)
  ↓ fetchPublicShowcaseCatalogBundle()  →  catalog gen counter
app/explore/hooks/useExploreShowcaseCatalog.ts
  ↓ fetchPublicShowcaseEntityContents() + fetchJplShowcaseOrbits()
  ↓ mergeNasaCatalog / mergeOrbitEntities
  ↓ ExploreSceneCanvas → ShowcaseScene | PlanetHistoryScene | EarthScene
app/explore/hooks/useExploreEarthMode.ts
  ↓ useExploreStageFossils → sceneCommandStore (fossils cho Earth mode)
```

**Quan sát**:
- Catalog merge vẫn dùng `lib/showcaseEntities` + `mergeShowcaseCatalog` (pragmatic exception DOMAIN_MAP).
- Fossil fetch **không** nằm trong `EarthScene` — orchestrator/hook (§2.5.A).
- `ExplorePageContent` chọn `sceneMode`: `earth` | `planet-history` | `showcase`.

**Drift 3.6.A — `surface-scene` trên explore** — ✅ RESOLVED  
`ExplorePageContent` bọc `surface-scene` + `--planet-accent` từ `useExploreShowcaseNav`.

**Drift 3.6.C — Narrative editor là Earth-only tool nhưng UI/copy generic gây nhầm lẫn** — ✅ RESOLVED (post-PR12)  
Workspace `narrative` thực chất hardcode `EarthScene` + chỉ có preset `earth-history`, nhưng tên gọi "Narrative" và labels schema-jargon (`Slug`, `Body slug`, `Beat`, `Sequence type`, `Eon`, ...) làm teacher tưởng đây là tool generic cho mọi entity. Fix:
- `page.tsx`: đổi tab label `Narrative` → `Câu chuyện Trái Đất`; mô tả workspace nói rõ scope Earth-only.
- `NarrativeStudioMode.tsx`: thêm scope-reminder banner; toàn bộ labels chuyển sang tiếng Việt thuần (`Beat` → `Cảnh kể chuyện`, `Slug` → `Bộ câu chuyện`, ...); mỗi label jargon có `Tooltip` giải thích; field `Body slug` được lock thành "Trái Đất 🌍 (cố định)"; sequence type dropdown hiện label "Niên đại địa chất (triệu năm)" thay vì `geologic_ma`.
- Toàn bộ button/badge/select dùng DS primitives từ PR12; empty-state cho beat list; per-row hover Tooltip cho ↑↓✕.

**Drift 3.6.D — Narrative editor giả vờ hỗ trợ multi-preset** — ✅ RESOLVED (Phase A, post-3.6.C)  
Sau khi rebrand sang "Câu chuyện Trái Đất", vẫn còn nhiều code path giả vờ hỗ trợ slug khác `earth-history` nhưng thực chất renderer luôn mount `EarthScene`. Cleanup Phase A dọn dead-but-misleading flexibility và đánh dấu **EXPANSION POINT** ở 5 layer. Phase A là tiền đề cho 3.6.E.

**Drift 3.6.E — Toàn bộ kiến trúc narrative bị xoá (May 2026)** — ✅ RESOLVED  
**Kết luận tổng**: sau Phase A của 3.6.D, mỗi đường code "polymorphic" trong narrative đều dẫn về duy nhất một dataset (Earth History). Cùng lúc, scope review (`3D = teaching aid`, không phải `NASA-Eyes-lite`) khẳng định không có kế hoạch thêm preset thứ 2 thực tế. Phase B kiến trúc Schema-first/SceneRegistry vì vậy là YAGNI cho khoản đầu tư ~3 tuần. Xoá triệt để:

**Frontend deleted**:
- Cả folder `client/src/features/content3d/narrative/` (10 file: store, service, types, hooks, selectors, public, presets/earth, api/narrativeSpacesApi, earthHistoryTypes — đã move).
- `client/src/app/studio/showcase-entities/NarrativeStudioMode.tsx` + tab "Câu chuyện Trái Đất" trong studio entities page (`useState<'entity' | 'narrative'>` collapse về single-mode entity).
- Folder dead `client/src/features/content3d/context/` (đã planned nhưng chưa wire — backend route `spaceContext.js` cũng depended on narrativeSpace.service).

**Backend deleted**:
- `services/api/features/content3d/narrative/routes/narrativeSpaces.js`
- `services/api/features/content3d/narrative/models/NarrativeSpace.js`
- `services/api/features/content3d/narrative/services/narrativeSpace.service.js`
- `services/api/features/content3d/routes/spaceContext.js` (`/api/content-3d/spaces/:slug/context` chết theo).
- Folder `services/api/features/content3d/narrative/` rename → `earth-history/` (tên cũ misleading sau khi xoá NarrativeSpace; folder giờ chỉ chứa Earth History data — earthHistory + fossils + phyla routes/models).

**Migrate & rename (giữ data, mất wrapper)**:
- `narrative/earthHistoryTypes.ts` → `earth/lib/earthHistoryTypes.ts` (canonical type home).
- `EARTH_HISTORY_PRESET` (NarrativeSpace wrapper) → **bị xoá hẳn**; consumer cuối (`StageTimePicker`) chuyển sang `earthHistoryData` thuần.
- `narrative/store.ts` (NarrativeStore, ~110 dòng, có `editorMode`/`draftSpace`/`resetToPreset`/`setSlug`) → `earth/stores/earthHistoryStore.ts` (~50 dòng, chỉ `stages`/`currentStage`/`setStageIndex`/`showInfoPanel`/`showTimeline`/`loadStages`).
- 8 consumer (EarthScene, InfoPanel, Timeline, Controls, FossilPanel, `/explore`, LessonContentBody, CoursePageClient, LessonPreview, StageTimePicker) cập nhật API. `useNarrativeSpace('earth-history').getBeatByRef.byTime/byId` thay bằng helper sync `findStageByTime(stages, time)` từ `earth/lib/earthHistoryHelpers.ts` — lesson consumers không cần Zustand chỉ để lookup.

**InfoPanel hoàn chỉnh hoá** (sau khi xoá narrative, InfoPanel mới là educational surface chính của 3D):
- Hero card đặt TIME + stage icon + name + range + description + Wikipedia ở đầu (trước đó bị đẩy xuống cuối).
- **Visual gauges** cho O₂ (0–35%), CO₂ (0–6000 ppm), nhiệt độ (-10–30°C), mực biển (-150 đến +250m), băng phủ (0–100%). Mỗi gauge có marker "hôm nay" để so sánh và semantic label ("Nóng bất thường", "Trái Đất quả cầu tuyết", v.v.).
- **Lifeform grid** dùng `imageUrl` từ DB (fallback emoji theo regex tên/loại) thay vì text chip nhạt — tận dụng field đã có sẵn.
- **Major events cards** code theo severity (`extinction` = catastrophic/red, `impact|volcanic|tectonic|climate` = major/amber, `biological|evolution` = minor/neutral).
- **Section collapse**: mỗi nhóm (Khí quyển, Khí hậu, Sự sống, Sự kiện, Hoá thạch) có chevron toggle — học sinh không phải scroll qua nhóm không quan tâm.
- **Per-stage tint** qua CSS var `--beat-accent` (= `currentStage.atmosphereColor`) chạy xuyên toàn bộ headers + gauge fill — geological era được "cảm" qua màu.
- **Toàn bộ design system tokens**: bỏ hardcode `text-gray-400`/`text-yellow-400` còn sót (drift PR11 cuối cùng); dùng `bg-ds-overlay`/`text-ds-text`/`border-ds-border`/`rounded-ds-card`/`rounded-ds-control` triệt để.

**Guardrails update**:
- `client/scripts/check-earth-history-ssot.mjs` — allowlist cho deep import canonical đổi từ `narrative/presets/earth.ts` → `earth/stores/earthHistoryStore.ts`. Verified `npm run check:guards` PASS.
- `client/DOMAIN_MAP.md` — bảng mapping bỏ row `content3d/narrative` và `content3d/context`; SSOT policy viết lại theo store mới (chỉ 2 tầng: API → static fallback, không còn 3 tầng narrative wrapper).
- `services/api/features/content3d/README.md` — viết lại reflect folder rename + history note.

**Net stats**:
- Xoá: ~14 file (10 frontend + 4 backend), ~9KB frontend + ~7KB backend code.
- Migrate: 2 file (types + helpers) → vị trí phản ánh đúng ownership.
- Rebuild: 1 file (InfoPanel, ~480 dòng — gấp 2x bản cũ vì gauges/cards/sections mới).
- API surface giảm: `/api/narrative-spaces/*` và `/api/content-3d/spaces/:slug/context` không còn tồn tại.

**3D scope sau xoá narrative** = "teaching aid" như đã chốt: một Earth scene chỉn chu (`EarthScene` + `FossilPoints` + `Timeline` + `Controls` + **InfoPanel mới**), Showcase solar system, không có editor scene và không có generic preset framework. Mọi mở rộng 3D tương lai (Mars, Venus, …) phải bắt đầu bằng spec educational content cụ thể, không phải bằng abstraction.

**Drift 3.6.B — File `SHOWCASE_TECH_NOTES.md` đặt trong `components/3d/showcase/`**  
Note kỹ thuật nằm chung với code TSX. Hợp lý cho dev mở cạnh code, nhưng nếu scale thêm note thì nên có `docs/3d/`.

---

## 3.7 PWA + Capacitor hybrid path

### Web (PWA)
- `PwaRegister` — register `/sw.js` chỉ ở production.
- `PwaInstallPrompt` — UI gợi ý cài.
- `PwaStatusBadge` — badge online/offline.
- `app/manifest.ts` — Next.js metadata.
- `app/offline/page.tsx` — fallback khi offline.

### Native (Capacitor 8)
- `capacitor.config.ts` + `android/`, `capacitor-shell/`.
- `lib/hybrid/mobileNative.ts` — wrapper duy nhất cho `Capacitor.*`:
  - `setSecureToken` / `clearSecureToken` — `@capacitor/preferences`
  - `hydrateTokenToLocalStorage()` — đồng bộ token từ Preferences sang `window.localStorage` để các fetch dùng cùng nguồn
  - `registerPushNotifications()` — `@capacitor/push-notifications`
- `HybridBootstrap` — root, Capacitor-only:
  - hydrate token
  - `App.addListener('appUrlOpen')` → deep link → `router.replace`
  - `Network.addListener('networkStatusChange')` → đặt `document.body.dataset.networkStatus`

**Quan sát**:
- Chỉ một file `lib/hybrid/mobileNative.ts` chứa **toàn bộ** Capacitor SDK call. Mọi nơi khác chỉ phụ thuộc helper này → nếu sau này đổi từ Capacitor sang React Native hay PWA thuần, blast radius nhỏ. Điểm mạnh.
- `registerPushNotifications()` chưa thấy được call từ đâu — hiện tại scaffolding cho mobile push (thực hiện trong tương lai).

**Drift 3.7.A — `registerPushNotifications` chưa wire**  
Helper tồn tại + dependency `@capacitor/push-notifications` đã cài, nhưng không có call site. Hoặc xóa, hoặc thêm wire vào `HybridBootstrap` sau permission flow.

---

## 3.8 Provider cây đầy đủ — “lúc 1 page mount, ai biết những gì”

Từ ngoài vào trong:

```
window.localStorage[galaxies_token]    ← persisted auth, nguồn của AuthProvider + every api/
useAuthStore                          ← user object live
ShowcaseCatalogProvider (Context)     ← catalog gen (cho cache invalidation explore)
LayoutChromeProvider (Context)        ← header/nav/starfield toggle
ErrorBoundaryWrap                     ← bắt render error
useTutorContextStore                  ← AI tutor mode (general/course)
(per-route)
  surface-edu | surface-studio | (chưa có surface-scene)
  + (3D pages) useEarthHistoryStore + usePlanetNarrativeStore + useSceneCommandStore + usePlaybackStore + useShowcaseStore
```

→ Mọi route nhận **đúng 1 user, 1 catalog gen, 1 chrome state** từ root, **1 surface theme** từ layout, và route 3D thì cộng thêm 4 store con.

---

## 3.10 Learning Agent — entitlement & guardrails (2026-05-21)

**Spec:** `docs/plans/learning-agent-system.md` (§3.5–§3.7), audit annex `docs/plans/agent-entitlement-guardrails.md`.

| Khía cạnh | Hiện trạng code | Target |
|-----------|-----------------|--------|
| Chat / RAG | `services/ai` (`server.py`, `agent_tools.py`), client **`CosmoAssistantWidget`** + `/api/agent/message` | Giữ; bọc LangGraph |
| Orchestrator Node | **Chưa có** `services/api/features/agent` | `POST /api/agent/message`, `entitlementResolver`, rate limit theo tier |
| Tool authority | Python shape-validate; client `parseTutorActions` navigate | **Node executors** — enrollment + trial scope + showcase unlock (dual check 3D) |
| Enrollment trial | `Enrollment` model: chỉ `progress[]` | Thêm `status`, `trialModuleId`, `trialExpiresAt` |
| Tiers | Plan cũ: guest / LP / enrolled | **+ Trial (gem), Teacher** — matrix 5 cột |
| Context snapshot | Tutor context store ad-hoc | Structured summary — **không** embed full lesson blocks |
| Out-of-syllabus | Undefined | Hybrid RAG: course first, general + disclaimer |
| Orchestration pattern | Linear handler | **LangGraph**: entitlement → RAG branch → LLM → authorize_tools (Node) |

**P0 blockers trước khi mở tool navigation rộng:** 0.8 entitlement, 0.9 server executors, lesson API enrollment gate không được bypass qua agent.

---

## 3.9 Tóm tắt Part 3 — vấn đề ở lớp wiring

1. **`surface-scene` định nghĩa nhưng 0 nơi áp dụng** — 3D overlay đang “mù” với token, tất cả accent/density vẫn hardcode hoặc rơi về Edu mặc định (§3.2.A, §3.6.A).
2. **Density tokens (`--density-*`) chưa có Tailwind utility** — spec lớp 3 “density per surface” chỉ dùng được nếu viết CSS thuần (§3.2.C).
3. **Marketing và product song song hai bộ token** (`cosmic-*` HSL vs `ds-*` var) — chủ đích nhưng nên chuyển landing thành `surface-marketing` để gói gọn (§3.2.B).
4. **Chỉ có 4/13 primitive đề xuất** (§3.2.D). Mỗi page mới vẫn phải tự dựng Dialog/Tabs/Toast — risk cao tái xuất visual drift.
5. **`authApi.ts` đa nhiệm** — chứa cả admin user mgmt + teacher application; `app/admin/page.tsx` phải import auth API → coupling không cần thiết (§3.5.A).
6. **Token key trùng định nghĩa** ở 2 file (`authApi` + `mobileNative`) (§3.5.B).
7. **`narrative/store.ts` lệch vị trí** so với pattern `stores/<x>.ts` của các domain khác (§3.3.A).
8. **`registerPushNotifications` orphan** — cài SDK nhưng chưa wire (§3.7.A).
9. **Hai boundary script** (import + earth SSOT) chưa tự chạy CI (đã ghi §1.13.A).

---

# PART 4 — Vấn đề hiện tại, nợ kỹ thuật & roadmap

Phần này gom **mọi drift** đã liệt kê ở Part 1–3 thành 1 backlog có ưu tiên, rồi gói chúng vào các PR thực thi tiếp theo (PR6 → PR12). Mỗi mục có: file ảnh hưởng, kết quả mong đợi, rủi ro, ước lượng effort.

## 4.1 Master drift table (P1–P3 consolidated)

Cột “P/E” = Priority (P0/P1/P2/P3) · Effort (S/M/L). Cột “Loại” = nhóm để gom PR.

| ID | Mục | P/E | Loại | Ghi chú |
|---|---|---|---|---|
| 1.1 | Root `package.json` reference 4 service không tồn tại (`dev:auth/courses/media/community/payment`) | P0/S | Hygiene | `install:all` & `dev:*` scripts gãy. |
| 1.2 | Secret/asset rời ở root: `aws_credentials.txt`, `cosmolearn-…firebase-adminsdk….json`, file `.glb`, PDF mojibake | P0/S | Security | Cần verify `.gitignore` + di dời. |
| 1.7.A | `components/ui/` là junk drawer (5 nhóm: app shell, system util, generic atom, domain 3D UI, error boundary) | P1/M | Restructure | 27 file. Phân loại theo §1.7. |
| 1.8.A | ~~4 domain thiếu `public.ts`~~ (`app/` deep import) | ~~P1/S~~ | **Partial 2026-05** | Barrels + `check:app-public`; `components/` + studio còn deep import |
| 1.8.B / 3.3.A | `narrative` lệch pattern: store ở `store.ts` (ngang), không `stores/` | P2/S | Consistency | Move file + update imports. |
| 1.9.A | Domain data 3D vẫn ở `lib/`: `iconicOrganisms`, `fossilPhyla`, `paleoTextureMap`, `planetTextureQuality`, `stageHotspots`, `solarSystemData`, `solarOrbitMath` | P2/M | Spec drift | DOMAIN_MAP cho phép “pragmatic exception”; đánh giá từng file có nên move. |
| 1.9.B | ~~`solarJourneyProgress.ts` ở `lib/`~~ → **`features/rewards/lib/`** + barrel **`rewards/public`** (PR10) | ~~P2/S~~ | Done | — |
| 1.9.C | ~~`postContent`, `postEngagement` ở `lib/`~~ → **`features/community/lib/`** + barrel **`community/public`** (PR10) | ~~P2/S~~ | Done | — |
| 1.10.A / 3.2.D | DS primitives: 4 ban đầu + Tooltip/Toast (explore); còn Dialog/Tabs/Select/Popover/Slider/Progress/Command | P1/L | DS expand | Mỗi primitive 1 sub-PR. |
| 1.12.A | `next@14.2.0` outdated (Next 15 GA, dev hint outdated) | P3/L | Toolchain | Major upgrade. |
| 1.13.A | ~~Boundary scripts chưa hook CI~~ | ~~P0/S~~ | **Partial 2026-05** | `prebuild` → `check:guards` (boundaries + earth-ssot + app-public); add `.github/workflows/client-guards.yml` if not on default branch yet |
| 2.4 | ~~`app/` import sâu `*/api/*`~~ | ~~P1/M~~ | **Resolved 2026-05** | `check:app-public` + barrels |
| 2.5.A | ~~`EarthScene` fetch direct~~ | ~~P0/S~~ | **Resolved 2026-05** | `useStageFossils` hooks |
| 2.5 (general) | `components/*` + `studio/*` import sâu `features/*/api/*` | P2/M | Spec drift | Codemod hoặc `check-components-public` (ngoài scope `app/` guard) |
| — | Explore page monolith ~1058 LOC | ~~P2/M~~ | **Done 2026-05** | `app/explore/{hooks,components}/` |
| — | `courses/public` re-export `server-only` | ~~P1/S~~ | **Done 2026-05** | `features/courses/server.ts` |
| 2.6 | ~~`features/admin/` + `content3d/context` stub~~ | ~~P1/S~~ | **Resolved 2026-05** | Analytics SSOT in `admin/api`; context API deleted |
| 3.2.A / 3.6.A | `surface-scene` chưa apply ở 3D overlay; `--planet-accent` không bao giờ được set | P1/M | DS wiring | Sửa `EarthScene`, `ShowcaseScene` overlay wrappers. |
| 3.2.B | Marketing dùng legacy `cosmic-*` HSL — chưa thuộc surface | P3/M | DS hygiene | Tạo `surface-marketing` nếu muốn gói gọn (optional). |
| 3.2.C | `--density-*` chưa expose Tailwind utility | P2/S | DS expand | Thêm `paddingX`, `gap` mapping vào tailwind.config. |
| 3.3.B | Store gọi API trực tiếp trong action (`sceneCommandStore.loadPhylumMetadata`, `narrativeStore.loadSpace`) | P3/S | Documented intent | Để nguyên hoặc tách hook (low value). |
| 3.5.A | `authApi.ts` gộp admin user mgmt + teacher application | P1/M | Spec drift | Tách `auth/api/teacherApplicationsApi.ts` + `admin/api/adminUsersApi.ts`. |
| 3.5.B | `TOKEN_KEY = 'galaxies_token'` hardcode trùng `authApi` + `mobileNative` | P2/S | Hygiene | Tách const dùng chung. |
| 3.7.A | `registerPushNotifications` orphan (không call site) | P2/S | Cleanup | Wire vào `HybridBootstrap` permission hoặc remove. |
| 3.6.B | `SHOWCASE_TECH_NOTES.md` lẫn trong `components/3d/showcase/` | P3/S | Doc placement | Optional, di chuyển sang `docs/3d/`. |

**Tổng (cập nhật 2026-05):** ~18 mục **còn mở** (sau khi đánh dấu Done hygiene/explore/courses-server/2.5.A/2.4 app/2.6). P0 vẫn: 1.1, 1.2 (root scripts, secrets). P1 chủ yếu: 1.7.A `components/ui`, 1.10.A DS primitives, 3.2.A surface (một phần đã wire explore).

---

## 4.2 Phân loại theo nguồn gốc vấn đề

- **Hygiene/Security (gọn ngọn, bắt buộc)**: 1.1, 1.2 — không động kiến trúc, làm trước.
- **CI tooling không enforce spec**: 1.13.A, 2.5.A — script đã có nhưng *không bắt vi phạm*. Sửa rất nhẹ tay nhưng giá trị cao (cứ mỗi PR mới về sau đều có guard).
- **Barrel + import sâu**: ~~2.4 (`app/`)~~ done; còn **2.5 (`components/`)**, 3.5.A (authApi đa nhiệm).
- **Lệch vị trí file (`narrative` store, `lib` chứa domain data)**: 1.8.B/3.3.A, 1.9.A/B/C — *cosmetic* đối với runtime, *quan trọng* cho navigation và quy tắc “một chỗ cho một việc”.
- **Design system thiếu lớp 3 cho 3D + thiếu primitives + density utility**: 1.10.A, 3.2.A/C/D, 3.6.A — phần dở dang lớn nhất sau PR1–PR5.
- **Stub/orphan**: ~~2.6~~ (done 2026-05); 3.7.A (push notif).
- **Toolchain version**: 1.12.A — defer.

---

## 4.3 Roadmap PR đề xuất (PR6 → PR12)

> **Nguyên tắc**: mỗi PR ≤ ~150 LOC diff thực, hoặc rộng nhưng chỉ codemod đồng nhất. Chạy `tsc --noEmit` + `node scripts/check-import-boundaries.mjs` + `npm run check:earth-ssot` cuối mỗi PR. Mỗi PR phải “xanh” trước khi sang PR sau.

---

### **PR6 — Hygiene + secret cleanup** *(P0/S)*

**Scope**:
- Sửa `package.json` root: xóa `dev:auth`, `dev:courses`, `dev:media`, `dev:community`, `dev:payment`; dọn `install:all` chỉ giữ `client + services/api + packages/auth-shared + services/ai (optional)`.
- Verify `.gitignore`: thêm `aws_credentials.txt`, `cosmolearn-*-firebase-adminsdk-*.json`, `*.glb` ở root nếu chưa có. **Không** xóa khỏi history (làm sau, nếu cần thì BFG).
- Move asset rời (`*.glb`, PDF mojibake, 2 file `.html` mockup) vào `docs/legacy-mockups/` hoặc `assets-source/` (không vào git).
- (Optional) Đổi tên file PDF mojibake.

**File đụng**: `package.json` (root), `.gitignore`. ~10 dòng.
**Kết quả**: `npm run dev:client` & `dev:server` vẫn chạy; `install:all` không gãy.
**Rủi ro**: Phải verify dev script nào đang được CI/Render dùng (đã có `render-platform.mdc` rule).

---

### **PR7 — CI guard chặt + boundary script fix** *(P0/S)*

**Scope**:
1. Sửa `client/scripts/check-import-boundaries.mjs` regex:
   - Thay pattern hiện tại bằng `from\s+['"]@\/(lib\/[A-Za-z0-9_-]*[Aa]pi|features\/[^'"]+\/api\/[^'"]+)['"]/g` (cho phép nested path) hoặc cụ thể:
     `features\/(content3d\/[^\/]+|[^\/]+)\/api\/`
   - Chạy script — sẽ phát hiện `EarthScene.tsx` import `earthApi`. Quyết định: hoặc thêm `EarthScene.tsx` vào ALLOWLIST tạm với comment + ticket, hoặc refactor (đẩy vào PR riêng nếu lớn).
2. Hook tự động:
   - `client/package.json` thêm `"prebuild": "node scripts/check-import-boundaries.mjs && node scripts/check-earth-history-ssot.mjs"`.
   - `.github/workflows/ci.yml` (nếu chưa có): job `lint-boundaries` chạy 2 script.

**File đụng**: `client/scripts/check-import-boundaries.mjs`, `client/package.json`, có thể `.github/workflows/*.yml`. ~30 dòng.
**Kết quả**: PR sau không thể vô tình thêm import vi phạm; build fail nếu vi phạm; `EarthScene` được “đăng ký” là debt rõ ràng.
**Rủi ro**: Render build có thể fail nếu chạy `npm run build` mà chưa chạy `prebuild` — kiểm tra `render.yaml` / build cmd.

---

### **PR8 — Barrel `public.ts` cho 4 domain + tách `authApi`** *(P1/M)*

**Scope**:
1. Tạo `features/{admin,community,payment,content3d/context}/public.ts` re-export đầy đủ (xem các domain đã có như `auth/public.ts` làm mẫu).
2. **Tách `authApi.ts`**:
   - `features/auth/api/teacherApplicationsApi.ts` ← `submitTeacherApplication`, `fetchMyTeacherApplicationStatus`, `fetchAdminTeacherApplications`, `reviewTeacherApplication`.
   - `features/admin/api/adminUsersApi.ts` ← `fetchAdminUsers`, `updateUserRole`, `updateUserStatus`, `AdminUser`, `UserRole`, `AccountStatus`.
   - `features/admin/public.ts` re-export `adminUsersApi` + (đã có) `adminAnalyticsApi`.
   - `features/auth/api/authApi.ts` chỉ giữ auth core (login/register/me/profile/password/firebase).
3. Codemod import paths trong `app/admin/page.tsx`, `app/apply-teacher/page.tsx`, `app/profile/page.tsx`, các nơi dùng admin/teacher app function — chuyển sang `@/features/admin/public` / `@/features/auth/public`.
4. Thay `app/community/**`, `app/courses/**` (read-only fetch), `app/my-courses`, `app/search`, `app/page.tsx`, `app/payment/**` từ deep `*/api/*` sang `<domain>/public`. (Auth deep imports được DOMAIN_MAP cho phép — giữ `authApi` import cho login/register OK.)

**File đụng**: 4 file `public.ts` mới, 2 file API mới, ~15 file consumer rename import.
**Kết quả**: 4 domain đủ barrel; `app/` import path đồng nhất; `app/admin/page.tsx` không còn import từ `auth/api/authApi`.
**Rủi ro**: TypeScript path mismatch nếu re-export thiếu type — chạy `tsc --noEmit` ở mỗi step. Nguy cơ vòng circular nếu admin import từ auth — admin nên import từ `@/features/auth/api/authApi` cho session helper, không qua `auth/public` (auth/public dùng store).

---

### **PR9 — Restructure `components/ui/` + cleanup orphans** *(P1/M)*

**Scope**:
Chia 27 file `components/ui/` thành 4 thư mục theo §1.7:

```
components/ui/                       ← chỉ giữ generic atom (sau khi migrate vào design-system)
  Loading.tsx, Spinner.tsx, Skeleton.tsx, EmptyState.tsx, PageHeader.tsx, SiteLogo.tsx
                                     (hoặc move vào design-system/primitives/)
components/layout/                   ← (đã có DashboardShell)
  AppChrome.tsx, AppHeader.tsx, AppShell.tsx, MobileBottomNav.tsx,
  LayoutChromeContext.tsx, LayoutChromeBoundary.tsx
components/system/                   ← infra runtime
  Analytics.tsx, ChunkLoadRecovery.tsx, ErrorBoundary.tsx, ErrorBoundaryWrap.tsx,
  HybridBootstrap.tsx, PwaRegister.tsx, PwaInstallPrompt.tsx, PwaStatusBadge.tsx
features/content3d/earth/ui/         ← domain Earth/3D presentational
  Controls.tsx, Timeline.tsx, InfoPanel.tsx, FossilPanel.tsx, FossilDetailOverlay.tsx,
  FeaturedOrganisms.tsx, Organism3DViewer.tsx
```

Đồng thời:
- Xóa `features/admin/api/adminAnalyticsApi.ts` re-export shim → sửa `admin/public.ts` re-export thẳng từ `lib/analytics/reporting/admin` (HOẶC chuyển toàn bộ `lib/analytics/reporting/admin.ts` vào `features/admin/api/adminAnalyticsApi.ts` — chọn 1 SSOT).
- Quyết định `content3d/context/api/content3dContextApi.ts`: nếu DOMAIN_MAP còn `planned`, giữ + comment `// PLANNED: chưa có route /api/content-3d/spaces/:slug/context`; nếu hủy planning thì xóa.
- Wire `registerPushNotifications` vào `HybridBootstrap` (sau khi có permission flow), hoặc xóa hàm + bỏ dependency `@capacitor/push-notifications`.

**File đụng**: ~27 file move/rename + ~50 file consumer update import path. Lớn nhưng codemod đồng nhất.
**Kết quả**: `components/` phẳng và phân loại đúng concept; spec “domain UI nằm trong feature” được tuân.
**Rủi ro**: Đụng nhiều import path → chạy boundary check + tsc cẩn thận. Có thể chia làm 2 PR nhỏ (move vs orphan cleanup) nếu diff quá to.

---

### **PR10 — Domain data move ra khỏi `lib/`** *(P2/M)*

**Scope**:
1. Move community helpers:
   - `lib/postContent.ts` → `features/community/lib/postContent.ts`
   - `lib/postEngagement.ts` → `features/community/lib/postEngagement.ts`
   - Re-export từ `community/public.ts`.
2. Move rewards-only:
   - `lib/solarJourneyProgress.ts` → `features/rewards/lib/solarJourneyProgress.ts`.
3. Đánh giá showcase + earth domain data ở `lib/`:
   - **Giữ** `solarSystemData.ts`, `solarOrbitMath.ts`, `showcaseEntities.ts`, `mergeShowcaseCatalog.ts`, `paleoTextureMap.ts`, `planetTextureQuality.ts`, `stageHotspots.ts`, `geo.ts`, `geoPlaces.ts`, `iconicOrganisms.ts`, `fossilPhyla.ts` ở `lib/` **nếu** chúng được consume từ cả 3D + studio + (có khi) SSR — DOMAIN_MAP đã cho phép “pragmatic exception”. Document từng file ở DOMAIN_MAP §Cross-cutting.
   - HOẶC move `iconicOrganisms.ts` + `fossilPhyla.ts` + `paleoTextureMap.ts` → `features/content3d/earth/lib/`; `solarSystemData/Math` → `features/content3d/showcase/lib/`. Cần verify chúng không bị `lib/` khác phụ thuộc trước.

**File đụng**: 3–10 file lib move + barrel update + import codemod.
**Kết quả**: `lib/` thuần utilities/data shared cross-domain; rõ ranh “lib = no domain”.
**Rủi ro**: Circular nếu `features/<a>/lib/x` import từ `features/<b>/public`. Giữ chỉ type-only imports cross-feature.

---

### **PR11 — Design system: surface-scene wiring + density utility** *(P1/M)*

**Scope** (✅ DONE 2026-05-12):
1. ✅ **Wire `surface-scene`**:
   - `app/explore/ExplorePageContent.tsx`: `<main className="surface-scene" style={{ '--planet-accent': planetAccent }}>` bọc canvas + `.ui-overlay`.
   - `planetAccent` resolve từ `selectedSolarPlanetIndex` (fallback `activeResolved.linkedPlanetName`) qua `resolvePlanetAccent()` trong `features/content3d/showcase/lib/planetAccent.ts`.
   - `ShowcaseEntityPanel` thay 100% hex hardcode (`#0b0f16`, `#f0c35d`, `#2a3447`, …) bằng `bg-ds-overlay`, `border-ds-border`, `text-ds-accent`. Chart-bar default accent đổi `'rgba(34,211,238,0.85)'` → `'var(--color-accent)'` để tự retint per planet.
   - `InfoPanel` + `Controls`: shell chuyển `glass` → `bg-ds-overlay border border-ds-border backdrop-blur-md`. **Beat accent (atmosphereColor) cố tình giữ** — đó là domain semantic của geological era, không phải surface token.
2. ✅ **Density utility**: `tailwind.config.ts` thêm `padding.ds-{x,y,content}`, `gap.{ds,ds-content}`, `spacing.{ds-content,ds-gap}`. Primitives đã consume sẵn (Input dùng `px-[var(--density-pad-x)]` từ trước, Dialog dùng `px-ds-content`). Button cố ý giữ size variants — density chỉ áp dụng khi consumer opt-in (`px-ds-x py-ds-y`), tránh đè size='sm/md/lg' đã quen.
3. ⏸ `surface-marketing` defer (cosmic-* hoạt động ổn — chỉ wrap khi xây thêm marketing page mới).

**File đụng** (8 file): `tailwind.config.ts`, `app/explore/ExplorePageContent.tsx`, `components/3d/showcase/ShowcaseEntityPanel.tsx`, `features/content3d/earth/ui/{InfoPanel,Controls}.tsx`, `features/content3d/showcase/{lib/planetAccent.ts, public.ts}`.
**Kết quả**: Focus Sao Hỏa → ShowcaseEntityPanel đổi accent đỏ (#d96343); focus Sao Thổ → vàng (#e8c170); focus mặt trăng → kế thừa accent của hành tinh mẹ. `tsc --noEmit` clean, build production thành công, guards pass.

---

### **PR12 — Design system: thêm 5 primitives ưu tiên** *(P1/L, có thể chia)*

**Scope** (✅ DONE 2026-05-12):

| Primitive | File | Consumer migration | Trade-off |
|---|---|---|---|
| `Dialog` + `DialogFooter` + `DialogCloseButton` | `design-system/primitives/Dialog.tsx` | (chưa migrate consumer cũ — chờ khi Studio refactor `window.confirm`/`window.prompt`) | Không dùng Radix, có ESC + backdrop-click + body-scroll-lock + return-focus, chưa có full focus trap |
| `Tabs` + `TabList` + `Tab` + `TabPanel` | `design-system/primitives/Tabs.tsx` | `app/admin/page.tsx` — 5 analytics tabs, ARIA + keyboard ←→/Home/End | Controlled (consumer giữ state) để URL-sync vẫn explicit |
| `Tooltip` | `design-system/primitives/Tooltip.tsx` | `ExploreShowcaseOverlay` — Learning Bridge badge | Pure-CSS hover/focus |
| `ToastProvider` + `useToast` | `design-system/primitives/Toast.tsx` | `useExploreRewards` / bridge hooks; `<ToastProvider>` ở `app/layout.tsx` | Tone `ds-*`; auto-dismiss |
| `Select` | `design-system/primitives/Select.tsx` | `app/admin/page.tsx` — 4 native `<select>` (module filter, depth filter, teacher app filter, user role + status) | Wrap native `<select>` để giữ keyboard nav / mobile picker / SR; không build custom dropdown đến khi có consumer thật yêu cầu |

**Kết quả**: 6 chỗ duplicate đã bị thay bằng primitive shared. ToastProvider sẵn sàng cho mọi page (replace `setTimeout`+state notification). Admin tabs có ARIA roles + keyboard nav đúng chuẩn lần đầu. `tsc --noEmit` clean, build production thành công.

**Defer** (chờ consumer):
- **Popover** — chưa có chỗ dùng (filter panels chưa được build). Khi cần, base trên Tooltip pattern hoặc add Floating UI.
- **Dialog focus trap** — sẽ thêm khi Studio migrate `window.confirm` (cần multi-button modal).
- **Custom Select dropdown** — chỉ build khi có yêu cầu type-ahead search trong dropdown lớn (>20 options).

---

### **(Defer) PR13+ — Toolchain & visual hygiene**

- **Next 15 upgrade** (1.12.A): cần riêng 1 PR + smoke test app router + dynamic imports + edge runtime.
- **`surface-marketing`** + dọn `cosmic-*` (3.2.B).
- **`SHOWCASE_TECH_NOTES.md` move** vào `docs/3d/` (3.6.B).

---

## 4.4 Sequencing & dependency

```
PR6 (hygiene)      ─┐
PR7 (CI guard)      ├─→ PR8 (barrel + authApi tách) ─→ PR9 (components/ui restructure) ─→ PR10 (lib move)
                    │
                    └─→ PR11 (DS surface-scene + density) ─→ PR12 (DS primitives, lặp 5 lần)
```

- PR6 + PR7 độc lập, làm song song.
- PR8 phải xong trước PR9 (barrel ổn rồi mới restructure consumer).
- PR9 phải xong trước PR10 (đã chuẩn hóa folder layout).
- PR11 + PR12 song song với PR8–10 (nhánh DS không đụng feature folder).

**Tổng effort ước lượng** (1 dev senior, full-time):
- PR6 + PR7: nửa ngày
- PR8: 1 ngày
- PR9: 1.5 ngày
- PR10: 1 ngày (hoặc 0.5 nếu chọn “giữ nguyên lib/”)
- PR11: 1 ngày
- PR12: 5 sub-PR × 0.5 ngày = 2.5 ngày
- **Tổng**: ~7 ngày người để đạt spec DOMAIN_MAP + design system 3-layer “sạch hết drift đã biết”.

---

## 4.5 Acceptance checklist sau toàn bộ roadmap

- [x] `node scripts/check-import-boundaries.mjs` — 0 violation, allowlist rỗng (2026-05).
- [x] `node scripts/check-earth-history-ssot.mjs` — PASS (2026-05).
- [x] `node scripts/check-app-public-imports.mjs` — PASS trên `app/` (2026-05).
- [ ] `tsc --noEmit` — 0 lỗi.
- [ ] `npm run lint` — 0 cảnh báo unused.
- [x] Mọi `app/**` — không import `@/features/*/api/*` (2026-05); RSC dùng `features/courses/server`.
- [x] Domain chính có `public.ts` (admin, community, payment, courses, …); SSR tách `*/server.ts` khi cần `server-only`.
- [ ] `lib/` chỉ chứa: `apiConfig`, `cn`, `firebaseClient`, `roles`, `navigationConfig`, `analytics/*`, `geo`, `ssrStableRandom`, `hybrid/*`, `topicPathMapping` (cross-cutting). Domain data đã ra hoặc được document chính thức làm exception.
- [ ] `components/` có 7 subfolder rõ vai trò: `3d/`, `auth/`, `community/`, `courses/`, `landing/`, `learning-path/`, `studio/` + `layout/`, `system/`. Không còn `components/ui/` đa nghĩa.
- [ ] `design-system/primitives/` có ≥9 component (4 hiện có + Dialog, Tabs, Tooltip, Toast, Select).
- [x] `surface-scene` + `--planet-accent` tại `app/explore` (`ExplorePageContent`).
- [ ] Studio planet narrative editor + density utilities toàn app (PR12 còn dở).
- [ ] `package.json` root chỉ liệt kê script chạy được.
- [ ] Secret/asset không còn ở repo root (hoặc đã `.gitignore` + có note).

---

## 4.6 Rủi ro xuyên suốt

1. **Mojibake tái diễn** — codemod bằng PowerShell trên Windows làm vỡ Vietnamese (đã gặp trong PR5). Quy ước: mọi script bulk edit phải dùng Node với `fs.readFileSync(path, 'utf8')` + `fs.writeFileSync(path, content, 'utf8')`. Đã có template ở `scripts/apply-studio-design-tokens.mjs` (đã xóa nhưng có thể tái dựng).
2. **Render deploy** — `prebuild` thêm script chạy lâu có thể đụng cold-start budget. Đo time trước khi merge PR7.
3. **Visual regression khi wire `surface-scene`** — thay accent động có thể đổi tone HUD. Nên có 2 ảnh trước/sau cho mỗi surface (PR11).
4. **Circular import** — gặp ở PR8/PR9/PR10 khi codemod barrel. Cứ vi phạm thì tsc sẽ báo; giải pháp: `import type` cho cross-domain types.

---

## 4.7 Tóm tắt cuối

Codebase (2026-05) sau PR design system + **hygiene wave** + **explore split**:

- **Đã cải thiện rõ:** `app/` import qua `public` (CI); 3D Earth fossil boundary; explore tách module; `courses/server` tách `server-only`; admin services colocated; earth owns history (doc + guards).
- **Còn drift chính:** `components/` + studio import sâu `api/`; marketing `cosmic-*`; DS primitives/density chưa đủ; root `package.json` scripts gãy (P0); AI tutor chưa có §kiến trúc agent riêng trong audit (dùng `AI_TUTOR_PLAN.md`).
- **Báo cáo tiến độ:** dùng bảng **“Tiến độ cập nhật doc (2026-05)”** đầu file + master table §4.1 (cột Done).

> **Audit kết thúc.** Khi bắt đầu PR thực thi, dùng tài liệu này làm bản tham chiếu — mỗi PR mở đầu bằng quote ID drift đang giải quyết để dễ truy ngược.
