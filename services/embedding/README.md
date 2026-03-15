# Embedding Service – Flag Embedding (BGE-M3)

Service embedding dùng [Flag Embedding](https://github.com/FlagOpen/FlagEmbedding) với model **BGE-M3** (BAAI/bge-m3), đa ngôn ngữ, hỗ trợ tiếng Việt.

## Cài đặt

```bash
cd services/embedding
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

Lần chạy đầu sẽ tải model từ Hugging Face (~2.3GB).

## Chạy

```bash
uvicorn server:app --host 0.0.0.0 --port 5004
```

Biến môi trường (tùy chọn):

- `BGE_MODEL`: model Hugging Face (mặc định `BAAI/bge-m3`)
- `BGE_MAX_LENGTH`: max token cho mỗi text (mặc định `512`)

## API

- **GET /health** – Trạng thái và tên model.
- **POST /embed** – Body: `{ "texts": ["câu 1", "câu 2"] }` → `{ "embeddings": [[...], [...]] }`.
- **POST /embed_one** – Body: `{ "text": "một câu" }` → `{ "embedding": [...] }`.

Vector trả về đã chuẩn hóa (L2), dùng inner product cho similarity.

## Dùng từ app (Next.js)

App gọi `POST /api/embed` (Next.js proxy tới service này). Cấu hình:

- Trong `.env.local`: `EMBEDDING_URL=http://localhost:5004`

RAG: index trước các đoạn văn (earth history, organisms, lessons) bằng `/embed`, lưu vector; khi chat embed câu hỏi bằng `/embed_one`, tìm top-k gần nhất rồi đưa vào prompt.
