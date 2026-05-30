# Platform security (Phase A + abuse / exposure)

Middleware và policy toàn API, bổ sung cho [course-content-delivery.md](./course-content-delivery.md).

## Module: `services/api/shared/security/`

| File | Vai trò |
|------|---------|
| `applyPlatformSecurity.js` | Helmet, trust proxy, gắn rate limit theo path |
| `rateLimiters.js` | Bucket auth, upload, agent, AI generate, LP events |
| `requestGuard.js` | Chặn path/method probe (WAF-lite) |
| `securityAudit.js` | Log + persist `SecurityAuditLog` (401/403/429, rate limit) |
| `learnerContentPolicy.js` | Redact `recallQuiz` trên surface học viên |

## Rate limits (mặc định, tắt khi `DISABLE_RATE_LIMIT=1` hoặc `NODE_ENV=test`)

| Path | Giới hạn | Mã lỗi |
|------|----------|--------|
| `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/firebase` | 10 / 15 phút / IP | `AUTH_RATE_LIMIT` |
| `/auth/register`, `/auth/register/resend-verification` | 8 / giờ / IP | `AUTH_SIGNUP_RATE_LIMIT` |
| `/auth/register/verify-email` | 20 / 15 phút / IP | `AUTH_VERIFY_RATE_LIMIT` |
| Toàn API | 600 / 15 phút / IP | `API_RATE_LIMIT` |
| `/upload*` | 40 / giờ / IP | `UPLOAD_RATE_LIMIT` |
| `/api/agent` | 80 / giờ / IP (+ limit tier trong agent) | `AGENT_RATE_LIMIT` |
| `/api/learning-path/editor/generate-quiz` | 30 / giờ / IP | `AI_GENERATE_RATE_LIMIT` |
| `/api/learning-path/events/batch` | 30 / phút / IP | `LP_EVENTS_RATE_LIMIT` |

**News crawl:** chỉ chạy scheduler nội bộ (`newsCrawlScheduler`), không có HTTP công khai — không rate limit HTTP.

## Learner content policy

- `GET /api/learning-path` — redact `recallQuiz` (mọi user; admin giữ full).
- `GET /api/learning-path/editor` — full (GV/admin).
- Courses: xem `course-content-delivery.md`.

## Env deploy

```env
TRUST_PROXY=1          # Render / reverse proxy — IP đúng cho rate limit
DISABLE_RATE_LIMIT=0   # Chỉ bật 1 khi debug local
```

## Smoke test

1. Gọi `/auth/login` sai >10 lần → `429` `AUTH_RATE_LIMIT` + bản ghi `SecurityAuditLog`.
2. `GET /api/learning-path` → `recallQuiz` không có `answer`.
3. Response có header `RateLimit-*` (chuẩn).

## Chưa làm (Phase B+)

- WAF edge (Cloudflare)
- Rate limit theo `userId` sau auth (hiện chủ yếu theo IP)
- Cohort time-lock trên `/learn`
- Cohort `revealMode` override
