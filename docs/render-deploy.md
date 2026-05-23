# Deploy lên Render (Dashboard)

App Next.js có **route động** (`/courses/[slug]`, `/community/post/[id]`, …) → dùng **Web Service**, không dùng **Static Site**.

## 1. API — New Web Service

| Ô | Giá trị |
|---|--------|
| Root Directory | *(để trống)* |
| Build Command | `npm run install:all` |
| Start Command | `cd services/api && npm start` |

Env (tối thiểu): `MONGODB_URI`, `JWT_SECRET`, `INTERNAL_API_SECRET`, `CLIENT_URL` (URL frontend sau bước 2), VNPay nếu cần.

## 2. Frontend — New Web Service (không phải Static Site)

| Ô | Giá trị |
|---|--------|
| Root Directory | `client` |
| Build Command | `npm ci && npx next build` |
| Start Command | `npm start` |

Env lúc build + runtime:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_BASE_URL` | URL API bước 1, **không** có `/api` cuối |
| `MEDIA_SERVICE_URL` | Cùng URL API |
| `NEXT_PUBLIC_FIREBASE_*` | Nếu dùng đăng nhập Google/Facebook |

Sau khi có URL frontend → quay lại API, set `CLIENT_URL` = URL đó → **Redeploy API**.

## 3. Blueprint (tùy chọn)

[`render.yaml`](../render.yaml) — cùng cấu hình trên.

## Local

- `services/api/.env` — xem `.env.example`
- `client/.env.local` — xem `.env.local.example`
