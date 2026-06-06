---
title: Galaxies Embedding
emoji: 🔢
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Galaxies Embedding (BGE-M3)

Service embedding đa ngôn ngữ (tiếng Việt) cho RAG CosmoLearn — [Flag Embedding](https://github.com/FlagOpen/FlagEmbedding) **BAAI/bge-m3**.

## API

| Method | Path | Body |
|--------|------|------|
| GET | `/health` | — |
| POST | `/embed_one` | `{ "text": "..." }` → `{ "embedding": [...] }` |
| POST | `/embed` | `{ "texts": ["...", "..."] }` → `{ "embeddings": [[...], ...] }` |

Vector đã L2-normalize (inner product = cosine similarity).

Nếu bật `EMBEDDING_API_KEY` trên Space, gửi header:

`Authorization: Bearer <token>` hoặc `X-Embedding-Token: <token>`

## Chạy local (dev)

```bash
cd services/embedding
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 5004
```

Lần đầu tải model ~2.3GB từ Hugging Face.

Biến môi trường (tùy chọn):

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `BGE_MODEL` | `BAAI/bge-m3` | Model Hugging Face |
| `BGE_MAX_LENGTH` | `512` | Max token / text |
| `BGE_USE_FP16` | `1` (local), `0` (Docker CPU) | FP16 inference |
| `EMBEDDING_API_KEY` | (trống) | Bật auth cho `/embed*` |
| `PORT` | `5004` local / `7860` Docker | Cổng uvicorn |

## Deploy Hugging Face Spaces (khuyên dùng — free 16GB RAM)

### 1. Tạo Space

1. [huggingface.co/new-space](https://huggingface.co/new-space)
2. **SDK:** Docker
3. **Hardware:** CPU basic (free)
4. Push nội dung thư mục `services/embedding/` (file `Dockerfile`, `server.py`, `requirements.txt`, `README.md` này)

Hoặc clone repo rồi copy:

```bash
cd services/embedding
git init && git remote add origin https://huggingface.co/spaces/YOUR_USER/galaxies-embedding
git add Dockerfile server.py requirements.txt README.md .dockerignore
git commit -m "Galaxies BGE-M3 embedding API"
git push
```

### 2. Secrets trên Space (Settings → Variables and secrets)

| Secret | Ví dụ | Ghi chú |
|--------|-------|---------|
| `EMBEDDING_API_KEY` | chuỗi ngẫu nhiên dài | **Bắt buộc** nếu Space public |

Build lần đầu ~15–20 phút (PyTorch + model). Space sleep sau ~48h không dùng — request đầu có thể mất 1–3 phút (cold start).

URL API: `https://YOUR_USER-galaxies-embedding.hf.space`

Test:

```bash
curl https://YOUR_USER-galaxies-embedding.hf.space/health
curl -X POST https://YOUR_USER-galaxies-embedding.hf.space/embed_one \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Trái Đất hình thành cách đây 4.6 tỷ năm\"}"
```

### 3. Nối với AI service (Render / local)

Trong `services/ai/.env` (hoặc env Render cho service AI):

```env
EMBEDDING_URL=https://YOUR_USER-galaxies-embedding.hf.space
EMBEDDING_API_KEY=cùng-secret-với-Space
EMBED_TIMEOUT_SEC=120
USE_RAG=1
```

Service **AI** gọi embedding — **API Node** không cần `EMBEDDING_URL` trừ script rebuild RAG.

Index `rag_index.json` nên build **local** (`npm run rag:build` từ root) rồi deploy kèm AI — tránh rebuild hàng nghìn chunk trên Space free.

## Dùng từ Next.js (tùy chọn)

`EMBEDDING_URL` trong `client/.env.local` nếu proxy `/api/embed`.
