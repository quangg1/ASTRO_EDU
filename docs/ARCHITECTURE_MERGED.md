# Kiến trúc gộp backend (Modular Monolith)

## Tổng quan

- **Một API duy nhất** (`services/api`) gộp: auth, courses, tutorials, payment, community, media.
- **Tách riêng** (scale độc lập): **earth-history** (Node), **ai**, **embedding** (Python).
- **Tổ chức theo feature** trong code để dễ làm branch/PR từng tính năng trên GitHub, tránh đè lên nhau.

## Cấu trúc thư mục `services/api`

```
services/api/
├── server.js              # Entry: mount các feature routes
├── config/
│   └── db.js              # Một kết nối MongoDB (DB: galaxies)
├── shared/
│   └── jwtAuth.js         # Middleware dùng chung: authMiddleware, optionalAuth, requireRole
└── features/
    ├── auth/              # Feature Auth
    │   ├── index.js       # Router: /auth
    │   ├── models/User.js
    │   └── lib/jwt.js, lib/passport.js
    ├── courses/           # Feature Courses + Tutorials
    │   ├── index.js       # Export coursesRouter, tutorialsRouter
    │   ├── routes/courses.js, routes/tutorials.js
    │   └── models/Course.js, Enrollment.js, Tutorial.js
    ├── payment/           # Feature Payment (VNPay, orders)
    │   ├── index.js       # Router: /api/payments
    │   ├── lib/vnpay.js
    │   └── models/Order.js
    ├── community/         # Feature Community (forums, posts, news)
    │   ├── index.js       # Export forumsRouter, postsRouter, newsRouter
    │   ├── routes/forums.js, posts.js, news.js
    │   └── models/Forum.js, Post.js, Comment.js, Vote.js
    └── media/             # Feature Media (upload + static files)
        └── index.js       # POST /upload, GET /files/*
```

## Port mặc định

| Thành phần        | Port | Ghi chú                          |
|-------------------|------|----------------------------------|
| **Unified API**   | 3002 | Auth, courses, tutorials, payment, community, media |
| Earth-history     | 3001 | Giữ tách để scale / tái sử dụng |
| Client (Next.js)  | 3000 |                                  |
| AI / Embedding    | -    | Python, chạy riêng              |

## Cách chạy

- **Chạy API gộp**: `npm run dev:api` (hoặc `cd services/api && npm run dev`).
- **Chạy earth-history**: `npm run dev:server` (port 3001).
- **Chạy client**: `npm run dev:client` (port 3000).

Client cần trỏ tất cả URL (auth, courses, media, community, payment) về **cùng một base** của API gộp (ví dụ `http://localhost:3002`).

## Biến môi trường client (khi dùng API gộp)

Trong `.env.local` của client, đặt **một base** cho API gộp:

```env
# Base URL của API gộp (một server cho auth, courses, payment, community, media)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002

# Nếu client vẫn dùng từng biến riêng, set tất cả cùng base:
NEXT_PUBLIC_AUTH_URL=http://localhost:3002
NEXT_PUBLIC_COURSES_URL=http://localhost:3002
NEXT_PUBLIC_MEDIA_URL=http://localhost:3002
NEXT_PUBLIC_COMMUNITY_URL=http://localhost:3002
NEXT_PUBLIC_PAYMENT_URL=http://localhost:3002

# Earth-history vẫn riêng (nếu dùng)
NEXT_PUBLIC_EARTH_HISTORY_URL=http://localhost:3001
```

(Client có thể refactor sau để chỉ dùng `NEXT_PUBLIC_API_BASE_URL` và gọi `/auth`, `/api/courses`, … từ đó.)

## Làm việc theo feature trên GitHub

- Mỗi **feature** nằm trong một thư mục: `features/auth`, `features/courses`, `features/payment`, `features/community`, `features/media`.
- Có thể tạo branch theo feature (ví dụ `feature/payment-vnpay`, `feature/community-vote`) và chỉ sửa trong thư mục feature đó → giảm conflict khi 2 người làm 2 feature khác nhau.
- **shared/** chỉ chứa code dùng chung (jwtAuth); tránh đưa logic nghiệp vụ vào đây.

## Database

- API gộp dùng **một MongoDB**, một database (mặc định `galaxies`). Tất cả collection (users, courses, enrollments, orders, forums, posts, …) nằm trong DB này.
- **Migration từ DB cũ:** Nếu bạn đã có data trong galaxies_auth, galaxies_courses, galaxies_community, galaxies_payment, chạy script sau (từ thư mục `services/api`, MongoDB đang chạy, `.env` có `MONGODB_URI`):

  ```bash
  node scripts/migrate-all-dbs.js
  ```

  Script copy toàn bộ collections sau sang `galaxies` (upsert theo `_id`, không ghi đè nếu đã tồn tại):

  | DB nguồn           | Collections |
  |--------------------|-------------|
  | galaxies_auth      | users |
  | galaxies_courses   | courses, enrollments, tutorials, tutorialcategories |
  | galaxies_community | forums, posts, comments, votes |
  | galaxies_payment   | orders |

## Dịch vụ vẫn tách riêng

- **earth-history**: API riêng (port 3001), có thể scale hoặc tái sử dụng cho project khác.
- **ai** (Python): RAG, chatbot, … scale độc lập.
- **embedding** (Python): Embedding vector, tìm kiếm semantic, scale độc lập.

Những service này gọi qua HTTP từ API gộp hoặc từ client tùy thiết kế.

## Tạo tài khoản admin / teacher

Chạy script seed (từ thư mục `services/api`):

```bash
node scripts/seed-admin-teacher.js
```

Mặc định tạo:

- **Admin:** `admin@galaxies.edu` / `admin123`
- **Teacher:** `teacher@galaxies.edu` / `teacher123`

Tùy chỉnh qua biến môi trường (trong `.env` hoặc khi chạy): `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEACHER_EMAIL`, `TEACHER_PASSWORD`, `ADMIN_DISPLAY_NAME`, `TEACHER_DISPLAY_NAME`. Nếu email đã tồn tại, script chỉ cập nhật role thành admin/teacher.
