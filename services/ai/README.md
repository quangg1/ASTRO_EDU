# AI Service (Python) – RAG, Security, Multimodal (text + ảnh)

Service AI tập trung: bảo mật đầu vào, RAG (embedding + retrieval), hội thoại đa phương thức (text + hình ảnh). Gọi LM Studio để sinh câu trả lời.

## Tính năng

- **Security**: Chặn câu hỏi vi phạm (blocklist), trả lời từ chối thống nhất tiếng Việt trước khi gửi tới model.
- **RAG**: Embed câu hỏi qua embedding service (BGE-M3), tìm top-k đoạn trong index, đưa vào system prompt.
- **Multimodal**: Nhận `image_base64` kèm tin nhắn; gửi sang LM Studio dạng `image_url` (OpenAI format) để model vision trả lời theo ảnh.

## Cài đặt

```bash
cd services/ai
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `LM_STUDIO_URL` | http://localhost:1234 | LM Studio API |
| `LM_STUDIO_MODEL` | local | Tên model (vision model nếu dùng ảnh) |
| `EMBEDDING_URL` | http://localhost:5004 | Embedding service (Flag BGE-M3) |
| `USE_RAG` | 1 | Bật/tắt RAG (1 hoặc 0) |
| `RAG_INDEX_PATH` | data/rag_index.json | Đường dẫn file index RAG |
| `RAG_TOP_K` | 4 | Số đoạn lấy từ RAG |

## Chạy

```bash
uvicorn server:app --host 0.0.0.0 --port 5005
```

- Cần **embedding service** chạy (5004) nếu bật RAG.
- Cần **LM Studio** chạy, load model (text hoặc vision nếu gửi ảnh).

## Xây chỉ mục RAG

```bash
# Embedding service phải chạy
python scripts/build_rag_index.py
```

Script mẫu embed vài đoạn văn, ghi ra `data/rag_index.json`. Có thể mở rộng: đọc dữ liệu từ API Earth History / khóa học, chunk và embed rồi ghi cùng format.

## API

### POST /chat

Body (JSON):

- `messages`: `[{ "role": "user"|"assistant", "content": "..." }]` (bắt buộc)
- `context`: `"general"` | `"course"`
- `course`: object (khi context = course): `courseSlug`, `courseTitle`, `lessons`, `currentLessonSlug`
- `image_base64`: chuỗi base64 ảnh (tùy chọn)
- `image_media_type`: `"image/jpeg"` | `"image/png"` (mặc định `image/jpeg`)

Khi có `image_base64`, tin user cuối được gửi tới LM Studio dạng multimodal (text + image). Cần model hỗ trợ vision (vd. LLaVA trong LM Studio).

Response: `{ "message": { "role": "assistant", "content": "..." } }`

### GET /health

`{ "status": "ok", "service": "ai", "rag": true|false }`

## Client (Next.js)

Cấu hình `AI_SERVICE_URL=http://localhost:5005`. Khi có URL này, Next.js proxy `/api/chat` tới service AI (và có thể gửi thêm `image_base64` từ form/upload).
