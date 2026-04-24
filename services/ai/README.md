# AI Service (Python) – RAG, Security, Multimodal (text + ảnh)

Service AI tập trung: bảo mật đầu vào, RAG (embedding + retrieval), hội thoại đa phương thức (text + hình ảnh). Sinh câu trả lời qua **Groq Cloud** (OpenAI-compatible), mặc định model `llama-3.3-70b-versatile`.

## Tính năng

- **Security**: Chặn câu hỏi vi phạm (blocklist), trả lời từ chối thống nhất tiếng Việt trước khi gửi tới model.
- **RAG**: Embed câu hỏi qua embedding service (BGE-M3), tìm top-k đoạn trong index, đưa vào system prompt.
- **Knowledge corpus**: Thư mục `knowledge/corpus/*.md` — nội dung mới (bài báo tóm tắt, cập nhật khoa học) được chunk + embed vào `data/rag_index.json`; có API rebuild/append và reload RAM.
- **AI Agent (function calling)**: Với backend hỗ trợ OpenAI-style `tools` (OpenRouter hoặc LM Studio), service gửi tool `open_lesson`, `go_to_explore` (khóa học) hoặc điều hướng app (ngoài khóa). Client gửi `agent_state` (pathname, query, nhãn màn hình) để model hiểu ngữ cảnh. Tắt bằng `USE_AGENT_TOOLS=0`. Khi có ảnh đính kèm, tool tạm tắt (tránh lỗi vision / model free không hỗ trợ tool).
- **Multimodal**: Nhận `image_base64` kèm tin nhắn; gửi tới LLM dạng `image_url` (OpenAI format, data URL base64). Cần model **VLM** (OpenRouter: `openrouter/free`, hoặc slug có vision như `…:free` / model trả phí; LM Studio: model vision local).

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
| `GROQ_API_KEY` | *(trống)* | API key của [Groq Cloud](https://console.groq.com/keys) |
| `GROQ_BASE_URL` | https://api.groq.com/openai/v1 | Base URL API Groq |
| `GROQ_MODEL` | llama-3.3-70b-versatile | Model LLM dùng cho chat + quiz |
| `EMBEDDING_URL` | http://localhost:5004 | Embedding service (Flag BGE-M3) |
| `USE_RAG` | 1 | Bật/tắt RAG (1 hoặc 0) |
| `RAG_INDEX_PATH` | data/rag_index.json | Đường dẫn file index RAG |
| `RAG_TOP_K` | 4 | Số đoạn lấy từ RAG |
| `KNOWLEDGE_CORPUS_DIR` | knowledge/corpus | Thư mục chứa `.md` để build RAG |
| `RAG_INCLUDE_SEED` | 1 | Khi rebuild, có gộp đoạn seed mặc định (1/0) |
| `RAG_CHUNK_MAX_CHARS` | 720 | Độ dài tối đa mỗi chunk khi cắt Markdown |
| `EMBED_CONCURRENCY` | 4 | Số request embed song song khi rebuild |
| `KNOWLEDGE_ADMIN_TOKEN` | *(trống)* | Nếu set, các `POST /knowledge/*` (trừ khi chỉ đọc) cần `Authorization: Bearer …` hoặc header `X-Knowledge-Token` |
| `USE_AGENT_TOOLS` | 1 | Bật gửi `tools` tới LLM (0 = tắt, chỉ còn fallback `[ACTION:…]` phía course) |

### Đặt Groq API key (local)

1. Lấy key tại [console.groq.com/keys](https://console.groq.com/keys) (dạng `gsk_...`).
2. Trong thư mục `services/ai`, tạo file **`.env`** (đã bị git ignore). Có thể copy mẫu: `copy example.env .env` (Windows) rồi sửa giá trị.
3. Trong `.env` ghi một dòng: `GROQ_API_KEY=gsk_...` (không có dấu ngoặc kép).
4. Cài lại phụ thuộc nếu chưa có: `pip install -r requirements.txt` (có `python-dotenv` để tự đọc `.env` khi chạy `server.py`).
5. Chạy lại từ `services/ai`: `uvicorn server:app --host 0.0.0.0 --port 5005`.

**Cách khác (PowerShell, chỉ phiên hiện tại):** trước khi chạy uvicorn:

`$env:GROQ_API_KEY = "gsk_..."`

**Biến hệ thống Windows (bền):** Cài đặt → Hệ thống → Giới thiệu → Cài đặt hệ thống nâng cao → Biến môi trường → Thêm biến người dùng `GROQ_API_KEY`, rồi mở terminal mới.

## Chạy

```bash
uvicorn server:app --host 0.0.0.0 --port 5005
```

- Cần **embedding service** chạy (5004) nếu bật RAG.
- Cần **OpenRouter** (`OPENROUTER_API_KEY`) hoặc **LM Studio** local với model phù hợp (vision nếu gửi ảnh).

## Feed kiến thức liên tục (corpus)

1. Thêm hoặc sửa file **`knowledge/corpus/*.md`** (Markdown, đoạn cách nhau bằng dòng trống để chunk đẹp hơn).
2. **Rebuild index** (cần embedding service đang chạy):
   - CLI: `python scripts/build_rag_index.py`
   - Hoặc HTTP: `POST http://localhost:5005/knowledge/rebuild` (kèm token nếu đã cấu hình `KNOWLEDGE_ADMIN_TOKEN`).
3. Nếu service AI đã mở sẵn: sau rebuild, RAM tự `reload_index()`. Nếu bạn chỉ copy file `rag_index.json` từ máy khác: gọi `POST /knowledge/reload`.
4. **Append nhanh** một đoạn không cần tạo file: `POST /knowledge/append` JSON `{ "text": "...", "source": "optional/id" }`.

**Docker / server:** mount volume cho `knowledge/corpus` và `data/rag_index.json` (hoặc cả thư mục `data/`) để không mất index khi tạo container mới.

## Automation workflow

1. **CI (GitHub Actions)**  
   - PR/push chỉnh `knowledge/corpus/**` → workflow **`Knowledge corpus`** chạy `validate_corpus.py` (UTF-8, không file quá lớn).  
   - File: `.github/workflows/knowledge-corpus.yml`

2. **Rebuild trên server đã deploy**  
   - Workflow **`Rebuild RAG index (remote)`**: chạy tay trên GitHub (*Run workflow*). Gọi `POST {AI_SERVICE_URL}/knowledge/rebuild` với Bearer token.  
   - Secrets: `AI_SERVICE_URL` (vd. `https://ai.example.com`), `KNOWLEDGE_ADMIN_TOKEN`.  
   - Nếu chưa cấu hình secret, job thoát 0 (không fail).  
   - File: `.github/workflows/knowledge-rebuild-remote.yml` — có thể bật `schedule:` (cron) trong file khi đã có URL + token ổn định.

3. **Máy local**  
   - `npm run rag:validate` — kiểm tra corpus.  
   - `npm run rag:build` — cần embedding (5004) bật; tương đương `python scripts/build_rag_index.py` trong `services/ai`.

4. **Cron trên VPS (không dùng GitHub)**  
   ```bash
   # Mỗi đêm 2h — chỉ khi AI + embedding luôn chạy trên server
   0 2 * * * curl -sfS -X POST "http://127.0.0.1:5005/knowledge/rebuild" -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json"
   ```

5. **GitOps (nâng cao)**  
   - Merge `.md` vào `main` → CI build index trong runner **có** embedding (Docker job chạy `embedding` + `python scripts/build_rag_index.py`) → commit hoặc upload `rag_index.json` lên object storage — cần tự cấu hình thêm vì image embedding + thời gian chạy khá nặng.

## Xây chỉ mục RAG

```bash
# Embedding service phải chạy
python scripts/build_rag_index.py
```

Script đọc corpus + seed (nếu `RAG_INCLUDE_SEED=1`), ghi `data/rag_index.json` dạng `{ "version": 1, "documents": [...] }`. Có thể mở rộng thêm nguồn (API Earth History, export khóa học) trong `knowledge_pipeline.py`.

## API

### POST /chat

Body (JSON):

- `messages`: `[{ "role": "user"|"assistant", "content": "..." }]` (bắt buộc)
- `context`: `"general"` | `"course"`
- `course`: object (khi context = course): `courseSlug`, `courseTitle`, `lessons`, `currentLessonSlug`
- `agent_state` (tùy chọn): `{ "pathname": "/explore", "search": "?stage=540", "route_label": "Khám phá" }` — ngữ cảnh UI
- `image_base64`: chuỗi base64 ảnh (tùy chọn)
- `image_media_type`: `"image/jpeg"` | `"image/png"` (mặc định `image/jpeg`)

Khi có `image_base64`, tin user cuối được gửi dạng multimodal (text + image). Cần model VLM (OpenRouter free: `openrouter/free` hoặc `OPENROUTER_VLM_MODEL`; LM Studio: LLaVA / tương đương).

Response: `{ "message": { "role": "assistant", "content": "..." }, "tool_calls"?: [ { "name": "open_lesson", "arguments": { "lesson_slug": "..." } }, ... ] }` — `tool_calls` chỉ có khi model gọi tool và server đã validate (slug trong khóa, Ma trong khoảng cho phép).

### GET /health

`{ "status": "ok", "service": "ai", "rag": true|false }`

### GET /knowledge/status

Thống kê index + corpus (không cần token).

### POST /knowledge/reload

Đọc lại `rag_index.json` vào RAM. Khi có `KNOWLEDGE_ADMIN_TOKEN`, gửi `Authorization: Bearer <token>` hoặc `X-Knowledge-Token: <token>`.

### POST /knowledge/rebuild

Build lại toàn bộ index từ corpus + seed. Cần embedding service; có thể mất vài chục giây nếu nhiều chunk.

### POST /knowledge/append

Body: `{ "text": "đoạn kiến thức mới", "source": "tùy chọn" }` — embed một chunk và nối vào index hiện có.

## Client (Next.js)

Cấu hình `AI_SERVICE_URL=http://localhost:5005`. Khi có URL này, Next.js proxy `/api/chat` tới service AI (và có thể gửi thêm `image_base64` từ form/upload).
