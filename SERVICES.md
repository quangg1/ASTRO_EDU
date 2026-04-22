# Galaxies Edu – Kiến trúc Microservices / API gộp

Project giáo dục thiên văn với đăng nhập (email, Google, Facebook), khóa học và mô phỏng 3D.

## Khuyến nghị: API gộp (Modular Monolith)

**Một backend gộp** `services/api` (port **3002**) thay cho auth, courses, media, community, payment. Kiến trúc theo **feature** để dễ branch/PR từng tính năng trên GitHub. Chi tiết: [docs/ARCHITECTURE_MERGED.md](docs/ARCHITECTURE_MERGED.md).

- Chạy API gộp: `npm run dev:api`
- Client: đặt `NEXT_PUBLIC_API_BASE_URL=http://localhost:3002` trong `.env.local` để trỏ mọi request về API gộp.
- **Vẫn tách riêng** (scale độc lập): earth-history (3001), embedding (5004), ai (5005).

## Các service (khi chạy tách từng service)

| Service      | Port | Mô tả |
|-------------|------|--------|
| **client**  | 3000 | Next.js – UI, visualization, trang khóa học, đăng nhập/đăng ký |
| **earth-history** | 3001 | API Earth History (fossils, phyla, paleo) – MongoDB |
| **api** (gộp) | 3002 | **Unified API**: auth, courses, tutorials, payment, community, media |
| **auth**    | 3002 | (legacy) Đăng ký/đăng nhập – dùng **api** thay thế |
| **courses** | 3003 | (legacy) Khóa học, Tutorial – dùng **api** thay thế |
| **media** | 3004 | (legacy) Upload – dùng **api** thay thế |
| **community** | 3005 | (legacy) Diễn đàn – dùng **api** thay thế |
| **payment** | 3006 | (legacy) VNPay – dùng **api** thay thế |
| **embedding** | 5004 | Flag Embedding (BGE-M3) – Python, dùng cho RAG / semantic search |
| **ai** | 5005 | AI service (Python) – RAG, security, multimodal (text + ảnh), OpenRouter hoặc LM Studio |

## Chạy local

### 1. Cài đặt

```bash
# Root
npm run install:all

# Hoặc từng thư mục:
cd services/earth-history && npm install
cd client && npm install
cd services/auth && npm install
cd services/courses && npm install
cd services/media && npm install
```

### 2. MongoDB

Cần MongoDB chạy (local hoặc Atlas). Mỗi service dùng DB riêng (hoặc cùng cluster, khác tên DB):

- server: `MONGODB_URI` → earth_history
- auth: `MONGODB_URI` → galaxies_auth
- courses: `MONGODB_URI` → galaxies_courses
- community: `MONGODB_URI` → galaxies_community

**Khi dùng API gộp (services/api):** Chỉ cần một DB `galaxies`. Nếu đã có data trong các DB cũ, chạy migration một lần:

```bash
cd services/api && node scripts/migrate-all-dbs.js
```

Xem chi tiết trong [docs/ARCHITECTURE_MERGED.md](docs/ARCHITECTURE_MERGED.md#database).

### 3. Biến môi trường

- **services/auth**: copy `services/auth/.env.example` → `.env`  
  - `JWT_SECRET`: dùng chung với courses (để verify token)  
  - Google: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) tạo OAuth 2.0 Client, thêm redirect URI `http://localhost:3002/auth/google/callback`  
  - Facebook: [Facebook Developers](https://developers.facebook.com/) tạo App, thêm redirect URI `http://localhost:3002/auth/facebook/callback`

- **services/courses**: copy `services/courses/.env.example` → `.env`  
  - `JWT_SECRET`: trùng với auth

- **services/media**: copy `services/media/.env.example` → `.env`  
  - `JWT_SECRET`: trùng với auth (để verify token upload)

- **services/community**: copy `services/community/.env.example` → `.env`  
  - `JWT_SECRET`: trùng với auth

- **services/payment**: copy `services/payment/.env.example` → `.env`  
  - `INTERNAL_API_SECRET`: trùng với courses (để confirm-enroll)
  - `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`: từ VNPay sandbox/production
  - `COURSES_SERVICE_URL`: http://localhost:3003/api

- **services/courses**: thêm `INTERNAL_API_SECRET` (trùng payment) vào `.env` nếu dùng payment.

- **services/api** (API gộp): ngoài `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `INTERNAL_API_SECRET`, có thể bật **email thông báo** (đơn giảng viên duyệt/từ chối) bằng SMTP tùy chọn:
  - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (ví dụ `Cosmo Learn <noreply@example.com>`)
  - `SMTP_PORT` (mặc định `587`), `SMTP_SECURE=true` nếu dùng cổng 465 (SSL)
  - Nếu không cấu hình, API vẫn chạy bình thường; chỉ bỏ qua gửi email.

- **client**: khi dùng **API gộp**, tạo `client/.env.local` với (copy từ `client/.env.local.example`):
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3002`
  - Restart `npm run dev:client` sau khi tạo/sửa `.env.local`.
  - Nếu không set, client mặc định gọi từng service cũ (3002, 3003, …) và dễ bị "Failed to fetch" nếu các service đó không chạy.
  - (Tùy chọn) `EMBEDDING_URL=http://localhost:5004` nếu dùng RAG
  - (Tùy chọn) `AI_SERVICE_URL=http://localhost:5005` để dùng AI service Python (RAG + ảnh)

- **services/embedding** (Python): `cd services/embedding && pip install -r requirements.txt`  
  - Chạy: `uvicorn server:app --host 0.0.0.0 --port 5004`  
  - Model: BGE-M3 (BAAI/bge-m3), đa ngôn ngữ (tiếng Việt). Client gọi qua `POST /api/embed`.

- **services/ai** (Python): xem `services/ai/README.md`. RAG cần embedding (5004). LLM: set `OPENROUTER_API_KEY` (OpenRouter; free tier có thể dùng `OPENROUTER_MODEL=openrouter/free`) hoặc để trống key và chạy LM Studio + `LM_STUDIO_URL` / `LM_STUDIO_MODEL`.

### 4. Chạy từng terminal

```bash
# Terminal 1 – API Earth History
npm run dev:server
# (dev:server runs services/earth-history)

# Terminal 2 – Auth
npm run dev:auth

# Terminal 3 – Courses
npm run dev:courses

# Terminal 4 – Client
npm run dev:client

# (Tùy chọn) Terminal 5 – Media (upload, cần cho Studio)
npm run dev:media

# (Tùy chọn) Terminal 6 – Embedding (Flag BGE-M3, cho RAG)
cd services/embedding && uvicorn server:app --host 0.0.0.0 --port 5004

# (Tùy chọn) Terminal 7 – Community (diễn đàn, tin thiên văn)
cd services/community && npm run dev

# (Tùy chọn) Terminal 8 – Payment (VNPay, mua khóa học)
npm run dev:payment

# (Tùy chọn) Terminal 9 – AI service (Python: RAG, security, multimodal). Cần embedding (5004) nếu RAG; LLM: OPENROUTER_API_KEY hoặc LM Studio local
cd services/ai && uvicorn server:app --host 0.0.0.0 --port 5005
```

Mở http://localhost:3000. Đăng ký/đăng nhập (email hoặc Google/Facebook nếu đã cấu hình), vào **Khóa học** → chọn khóa → **Tham gia** → chọn bài học (bài dạng visualization mở mô phỏng 3D).

### 5. Crawl tin thiên văn (RSS có cấu trúc — mặc định)

Script nằm trong **unified API** (`services/api`). **Mặc định** chỉ dùng dữ liệu trong feed (tiêu đề, tóm tắt, ảnh từ RSS; nếu thiếu ảnh có thể lấy `og:image` nhẹ từ trang bài). Bài được đánh dấu **link-out**: trong app hiển thị thẻ + tóm tắt; người dùng mở **bài gốc** trên site nguồn (tab mới).

```bash
cd services/api
# Cùng MONGODB_URI như khi chạy API (file .env trong services/api)
npm run crawl-news
```

Biến môi trường trong `.env`:

- `CRAWL_RSS_FEEDS` — URL RSS, phân tách bằng dấu phẩy (mặc định feed NASA breaking news).
- `CRAWL_MAX_ITEMS`, `CRAWL_DELAY_MS` — giới hạn số bài và chờ giữa các request.
- `CRAWL_FETCH_OG_IMAGE=false` — tắt bước tải HTML chỉ để lấy `og:image` khi RSS không có ảnh.
- `CRAWL_FETCH_FULL=true` — **tùy chọn**: tải HTML trang bài và trích nội dung (Readability, JSON-LD, khối WordPress…). Dễ lỗi trên site phức tạp; chỉ bật khi thật sự cần full text trong DB.

Mỗi bài crawl lưu **`rssCategories`** (từ thẻ `<category>` / `dc:subject` trong RSS). API: `GET /api/news?category=…&q=…` (tìm tiêu đề), `GET /api/news/categories` (danh sách chủ đề), và `GET /api/forums/tin-thien-van/posts?category=…&q=…` tương tự.

Xóa toàn bộ bài cũ trong Tin thiên văn rồi crawl lại (chỉ giữ bản crawl mới):

```bash
cd services/api
# PowerShell:
$env:PURGE_NEWS_CONFIRM="yes"; npm run purge-news
npm run crawl-news
```

### 6. Seed dữ liệu khóa học và tutorial

```bash
cd services/courses && npm run seed
cd services/courses && npm run seed:tutorials
```

## Luồng đăng nhập

- **Email/password**: Client gọi `POST /auth/login` hoặc `POST /auth/register` → Auth trả JWT → client lưu token (localStorage), gọi `GET /auth/me` để lấy profile.
- **Google/Facebook**: Client chuyển hướng tới Auth (`/auth/google` hoặc `/auth/facebook`) → Auth chuyển tới provider → provider callback về Auth → Auth tạo/tìm user, sinh JWT, redirect `CLIENT_URL/auth/callback?token=...` → client lưu token và chuyển tới /courses.

## Bảo vệ route

- Trang khóa học chi tiết (`/courses/[slug]`) yêu cầu đăng nhập; chưa đăng nhập thì redirect `/login?redirect=/courses/...`.
- Course service: enroll và progress cần header `Authorization: Bearer <token>`; token được verify bằng `JWT_SECRET` chung với Auth.
