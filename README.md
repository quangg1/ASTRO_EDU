# Galaxies (CosmoLearn)

**Nền tảng giáo dục thiên văn tương tác** — khóa học, lộ trình học, mô phỏng 3D, cộng đồng, gamification và trợ lý AI.

> *Interactive astronomy education platform — courses, learning paths, 3D simulations, community, rewards, and an AI tutor.*

Monorepo full-stack: **Next.js 14** (client) + **Express modular monolith** (API) + **Python AI/RAG** (embedding + agent). Kiến trúc phân tầng có guard CI tự động — phù hợp để review portfolio kỹ thuật.

---

## Tổng quan

Galaxies (thương hiệu sản phẩm: **CosmoLearn**) là hệ thống học thiên văn end-to-end, không chỉ là một demo 3D. Người học có thể:

- Theo **lộ trình học** có cấu trúc (learning path) và **khóa học** có cohort, bài giảng, quiz, assignment
- Khám phá **bầu trời đêm** và **lịch sử Trái Đất 4.6 tỷ năm** qua mô phỏng Three.js
- Tham gia **cộng đồng** (diễn đàn, tin tức, thảo luận theo bài học)
- Tích lũy **gem**, mua trang trí avatar, nhận phần thưởng khi hoàn thành nội dung
- Hỏi **trợ lý AI Cosmo** (RAG + tool-calling trên ngữ cảnh bài học / explore)
- Giáo viên dùng **Studio** để soạn khóa học, concept map, showcase entities, lịch thiên văn

Phía vận hành có **admin console**: quản lý user, đơn hàng, moderation, gem economy, promo codes, audit.

---

## Tính năng chính

| Module | Mô tả |
|--------|--------|
| **Khóa học & Tutorial** | Landing, checkout, cohort, lesson player, quiz, tiến độ học |
| **Learning Path** | Curriculum có cấu trúc, next-action cho learner |
| **Explore 3D** | Bầu trời (constellation bridge), Earth history timeline, passport/gamification |
| **Content 3D Studio** | Soạn narrative, showcase entities, sky targets, fossil/planet data |
| **Concepts** | Knowledge graph / concept studio cho giáo viên |
| **Community** | Forum, news, comments rich-text, moderation, tags |
| **Auth & Onboarding** | Email/password, Google/Facebook OAuth, onboarding flow |
| **Rewards & Gem Shop** | Gem tiers, avatar decorations, voucher thanh toán khóa học |
| **Payment** | Checkout nội bộ (demo), orders, promo codes |
| **Agent (Cosmo)** | Chat AI với RAG, semantic cache, tool execution theo domain |
| **Astronomy Calendar** | Sự kiện thiên văn — learner view + studio admin |
| **Admin** | Users, courses, orders, gem economy, system, audit, broadcast |
| **Messages & Notifications** | Hộp thư, chuông thông báo in-app |

**Số liệu tham khảo:** ~67 route Next.js ([`client/ROUTE_INVENTORY.md`](client/ROUTE_INVENTORY.md)), 18 bounded context API ([`services/api/features/`](services/api/features/)), 500k+ bản ghi fossil (Paleobiology Database).

---

## Tech stack

### Frontend (`client/`)

| Công nghệ | Vai trò |
|-----------|---------|
| **Next.js 14** (App Router) | SSR/RSC, routing, API proxy |
| **React 18 + TypeScript** | UI components |
| **React Three Fiber + Three.js** | Mô phỏng 3D (Trái Đất, bầu trời, showcase) |
| **Zustand** | Client state theo domain |
| **Tailwind CSS** | Styling |
| **Capacitor** | Hybrid mobile (Android/iOS) — tùy chọn |

### Backend (`services/api/`)

| Công nghệ | Vai trò |
|-----------|---------|
| **Node.js 20+ · Express** | Unified REST API (modular monolith) |
| **MongoDB · Mongoose** | Persistence |
| **Zod** | Validate env + request body |
| **JWT + OAuth** | Auth (Google, Facebook) |
| **Brevo / Resend / SMTP** | Transactional email |

### AI & Search (`services/ai/`, `services/embedding/`)

| Công nghệ | Vai trò |
|-----------|---------|
| **Python · FastAPI (uvicorn)** | AI service (:5005), embedding service (:5004) |
| **BGE-M3** | Embedding cho RAG / semantic cache |
| **OpenRouter / LM Studio** | LLM inference |

### Shared packages

- [`packages/contracts`](packages/contracts) — shared types/contracts FE ↔ BE
- [`packages/auth-shared`](packages/auth-shared) — auth utilities dùng chung

### DevOps

- **GitHub Actions** — architecture guards (client + API), route inventory check
- **Render** — deploy blueprint ([`render.yaml`](render.yaml), [`docs/render-deploy.md`](docs/render-deploy.md))

---

## Kiến trúc (điểm nổi bật cho reviewer)

Dự án áp dụng **Clean Architecture có kiểm soát** — không chỉ chia thư mục mà còn **enforce bằng script + CI**.

### Backend — layered modular monolith

Luồng phụ thuộc một chiều:

```
routes → controllers → services → repositories → models
```

Cross-feature chỉ qua **public service** của domain đích, không deep-import nội bộ. Refactor lớn: route file cohorts ~925 → ~198 LOC, admin index ~911 → ~17 LOC.

- Tài liệu: [`docs/architecture/api-layering.md`](docs/architecture/api-layering.md)
- Guard: `services/api/scripts/check-architecture.mjs` (baseline ratchet = 0 violations)
- CI: [`.github/workflows/api-guards.yml`](.github/workflows/api-guards.yml)
- Tests: `cd services/api && npm test` (Node built-in test runner)

### Frontend — feature-first + traceability

```
app/route/page.tsx  →  features/<domain>/public.ts  →  ui | hooks | api
```

- **`app/`**: thin route shell — không deep-import `features/*/api|hooks|stores|ui`
- **`features/<domain>/`**: bounded context khớp backend (`auth`, `courses`, `community`, …)
- **`features/<domain>/public.ts`**: cổng duy nhất cross-boundary
- **Traceability**: [`client/ROUTE_INVENTORY.md`](client/ROUTE_INVENTORY.md) map page → feature → API → backend mount; hub lớn có [`TRACE.md`](client/src/app/explore/TRACE.md)

- Tài liệu: [`docs/architecture/frontend-layering.md`](docs/architecture/frontend-layering.md)
- Domain map: [`client/DOMAIN_MAP.md`](client/DOMAIN_MAP.md)
- Guards (chạy trước mỗi build): `npm run check:guards` trong `client/`
- CI: [`.github/workflows/client-guards.yml`](.github/workflows/client-guards.yml)

---

## Cấu trúc monorepo

```
galaxies/
├── client/                      # Next.js 14 frontend
│   ├── src/app/                 # Routes (thin shells)
│   ├── src/features/            # Domain modules (public, api, ui, hooks, …)
│   ├── src/components/          # Shared UI + components/3d (Three.js)
│   ├── scripts/                 # Architecture guards, route inventory generator
│   └── ROUTE_INVENTORY.md       # Generated traceability matrix
│
├── services/
│   ├── api/                     # Unified Express API (modular monolith)
│   │   ├── features/            # auth, courses, community, agent, …
│   │   ├── shared/              # http helpers, errors, BaseRepository
│   │   └── scripts/             # check-architecture.mjs
│   ├── ai/                      # Python — RAG, agent, multimodal
│   └── embedding/               # Python — BGE-M3 embeddings
│
├── packages/
│   ├── contracts/               # Shared contracts
│   └── auth-shared/
│
├── docs/
│   ├── architecture/            # Layering docs + ADRs
│   └── render-deploy.md
│
├── render.yaml                  # Render deploy blueprint
├── SERVICES.md                  # Chi tiết service ports & env
└── package.json                 # Root scripts: dev:api, dev:client, install:all
```

---

## Chạy local

### Yêu cầu

- **Node.js** 20–22
- **MongoDB** (local hoặc Atlas)
- *(Tùy chọn)* Python 3.10+ cho AI/embedding/RAG

### 1. Cài dependencies

```bash
npm run install:all
```

### 2. Cấu hình môi trường

**API** — copy [`services/api/.env.example`](services/api/.env.example) → `services/api/.env`:

```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/galaxies
JWT_SECRET=<random-secret>
CLIENT_URL=http://localhost:3000
```

**Client** — tạo `client/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
API_PROXY_TARGET=http://localhost:3002
```

*(OAuth, email, AI — xem comment trong `.env.example` nếu cần đủ tính năng.)*

### 3. Seed dữ liệu (lần đầu)

```bash
cd services/api
npm run seed:core
```

### 4. Khởi chạy (mỗi service một terminal)

```bash
# Terminal 1 — API
npm run dev:api          # http://localhost:3002

# Terminal 2 — Frontend
npm run dev:client       # http://localhost:3000

# Terminal 3–4 — AI (tùy chọn, cho Cosmo agent / RAG)
npm run dev:embedding    # :5004
npm run dev:ai           # :5005
```

Mở trình duyệt: **http://localhost:3000**

> **Lần đầu start chậm?** Next.js compile R3F/Three.js (~10–30s). Chạy API trước, đợi MongoDB connected rồi mới start client.

---

## Kiểm thử & chất lượng

```bash
# Backend unit/integration tests
cd services/api && npm test

# Frontend architecture guards (import boundaries, route inventory, …)
cd client && npm run check:guards

# Backend architecture guard
cd services/api && node scripts/check-architecture.mjs
```

CI trên GitHub Actions chạy các guard trên mỗi PR — kiến trúc không được regress so với baseline.

---

## Tài liệu kỹ thuật

| Tài liệu | Nội dung |
|----------|----------|
| [`SERVICES.md`](SERVICES.md) | Ports, env, legacy vs unified API |
| [`client/DOMAIN_MAP.md`](client/DOMAIN_MAP.md) | Backend ↔ frontend domain alignment |
| [`client/ROUTE_INVENTORY.md`](client/ROUTE_INVENTORY.md) | Page → feature → API traceability |
| [`docs/architecture/api-layering.md`](docs/architecture/api-layering.md) | Backend layering & ADRs |
| [`docs/architecture/frontend-layering.md`](docs/architecture/frontend-layering.md) | Frontend guards & dual-home UI |
| [`docs/use-case-coverage.md`](docs/use-case-coverage.md) | Use case ↔ codebase |
| [`docs/render-deploy.md`](docs/render-deploy.md) | Deploy production |
| [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) | Git workflow (feature branch → main) |

---

## Luồng dữ liệu end-to-end (ví dụ)

```
Browser  →  app/courses/[slug]/page.tsx
         →  features/courses/public.ts
         →  features/courses/api/*  (HTTP client)
         →  services/api/features/courses/routes/*
         →  controllers → services → repositories → MongoDB
```

Chi tiết trace từng route: mở [`client/ROUTE_INVENTORY.md`](client/ROUTE_INVENTORY.md), cột **Features** và **Backend mounts**.

---

## Deploy

Production deploy qua **Render** (blueprint [`render.yaml`](render.yaml)): Next.js web service + Node API + MongoDB Atlas. Hướng dẫn đầy đủ: [`docs/render-deploy.md`](docs/render-deploy.md).

---

## License

MIT License
