# Deploy Render — backend trước, frontend sau

Frontend **giữ nguyên**. Chỉ cần **thứ tự deploy**: API chạy và có URL public → rồi mới build frontend với URL đó.

## Bước 1 — Chỉ backend (làm ngay)

Render → **New → Web Service** (không phải Static Site).

| Ô | Giá trị |
|---|--------|
| Repository | `quangg1/ASTRO_EDU` |
| Branch | `main` |
| **Root Directory** | *(để trống — root repo)* |
| **Build Command** | `npm run install:all` |
| **Start Command** | `cd services/api && npm start` |
| **Health Check Path** | `/health` |

### Environment (API)

| Key | Bắt buộc | Ghi chú |
|-----|----------|---------|
| `MONGODB_URI` | Có | MongoDB Atlas |
| `JWT_SECRET` | Có | Chuỗi bí mật dài |
| `INTERNAL_API_SECRET` | Có | Chuỗi bí mật khác |
| `CLIENT_URL` | Có | URL frontend **sau này** (vd. `https://cosmo-learn-fr.onrender.com`), hoặc tạm URL dự kiến; sửa lại sau bước 2 |
| `NODE_VERSION` | Khuyến nghị | `22` |
| `VNPAY_*` | Nếu dùng thanh toán | Xem `SERVICES.md` |

Deploy xong → copy **URL public** của service, ví dụ:

`https://galaxies-api.onrender.com`

Kiểm tra: mở `https://<tên-api>.onrender.com/health` → `{"status":"OK",...}`.

**Chưa cần** deploy frontend. **Chưa cần** sửa code client.

---

## Bước 2 — Frontend (sau khi API đã chạy)

Render → **New → Web Service**.

| Ô | Giá trị |
|---|--------|
| **Root Directory** | `client` |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Publish Directory** | *(để trống)* |

### Environment (frontend) — set **trước** khi build

| Key | Value |
|-----|--------|
| `NODE_VERSION` | `22` |
| `NEXT_PUBLIC_API_BASE_URL` | URL API bước 1, **không** có `/api` cuối |
| `MEDIA_SERVICE_URL` | Cùng URL API |
| `NEXT_PUBLIC_FIREBASE_*` | Nếu dùng đăng nhập Google/Facebook |

Deploy frontend → copy URL web (vd. `https://cosmo-learn-fr.onrender.com`).

Quay lại **service API** → sửa `CLIENT_URL` = URL frontend → **Redeploy API** (CORS).

---

## Tóm tắt phụ thuộc

```text
Bước 1: API  ──►  có URL (health OK)
Bước 2: Web  ──►  NEXT_PUBLIC_API_BASE_URL = URL API (lúc build)
                 CLIENT_URL trên API = URL web (sau khi web live)
```

## Blueprint

[`render.yaml`](../render.yaml) — cùng thứ tự; `CLIENT_URL` để `sync: false` vì API deploy trước frontend.

## Local

- API: `services/api/.env` ← `.env.example`
- AI: `services/ai/.env` ← `example.env`
- Client: `client/.env.local` ← `.env.local.example`

---

## Bước 3 — AI service (Cosmo + RAG)

Service Python **nhẹ** (LLM qua OpenRouter/Groq; embedding qua Hugging Face Space). Starter ~512MB RAM đủ cho `rag_index.json`.

Render → **New → Web Service** (hoặc Blueprint service `galaxies-ai` trong [`render.yaml`](../render.yaml)).

| Ô | Giá trị |
|---|--------|
| **Root Directory** | `services/ai` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |

### Environment (galaxies-ai)

| Key | Bắt buộc | Ghi chú |
|-----|----------|---------|
| `OPENROUTER_API_KEY` | Có (hoặc `GROQ_API_KEY`) | **Không** dùng LM Studio trên Render |
| `LLM_PROVIDER_ORDER` | Khuyến nghị | `openrouter,groq` |
| `EMBEDDING_URL` | Có (RAG) | `https://quangminhchinhdai-embedding.hf.space` |
| `EMBEDDING_API_KEY` | Có | Cùng secret trên HF Space |
| `EMBED_TIMEOUT_SEC` | Khuyến nghị | `120` |
| `USE_RAG` | | `1` |
| `USE_AGENT_TOOLS` | | `1` |
| `OPENROUTER_SITE_URL` | Khuyến nghị | URL frontend production |
| `GROQ_API_KEY` | Tuỳ chọn | Fallback LLM |

Kiểm tra: `https://<galaxies-ai>.onrender.com/health` → `"status":"ok"`, `"rag": true`.

### Nối API → AI

Trên **galaxies-api**:

| Key | Value |
|-----|--------|
| `AI_SERVICE_URL` | `https://<galaxies-ai>.onrender.com` |

Redeploy API → thử Cosmo.

```text
galaxies-web → galaxies-api → galaxies-ai → OpenRouter/Groq
                                    ↓
                        HF Space (BGE-M3 embedding)
```
