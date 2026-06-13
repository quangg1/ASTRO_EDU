# Astronomy Calendar



Lịch sự kiện thiên văn — **nguồn công khai: MongoDB (published)**, compute chỉ dùng **import gợi ý** qua admin.



## Kiến trúc



| Thành phần | Mô tả |

|------------|--------|

| `models/AstronomyEvent.js` | Sự kiện biên tập: `draft` → `review` → `published` |

| `models/AstronomyEventReminder.js` | Nhắc nhở trước đỉnh (24h) |

| `models/UserAstronomyEventEngagement.js` | Remind / check-in / gem |

| `lib/generateCalendarEvents.js` | Gợi ý từ astronomy-engine + IAU meteors (admin import) |

| `jobs/reminderScheduler.js` | Cron 15 phút → notification + WS |



Bootstrap: nếu chưa có sự kiện `published`, server tự import + publish 365 ngày.



## API công khai



```

GET /api/astronomy-calendar/tonight

GET /api/astronomy-calendar/upcoming?days=90

GET /api/astronomy-calendar/month?year=2026&month=8

GET /api/astronomy-calendar/featured

GET /api/astronomy-calendar/weather

POST /api/astronomy-calendar/events/:eventId/remind   (auth)

POST /api/astronomy-calendar/events/:eventId/check-in (auth, trong khung sự kiện → gem)

```



## Admin (`/api/admin/astronomy-calendar`, scope `system`)



- `GET /` — danh sách

- `POST /import-suggestions` — `{ days, publish }`

- `POST /`, `PATCH /:id`, `POST /:id/publish`, `DELETE /:id`



## Client



- `/calendar` — Lịch Thiên Văn (timeline mobile, lưới tháng desktop, filter, urgency, moon strip)

- Dashboard: `TonightSkyPanel` + urgency teaser

- Explore Sky HUD: subset + link `/calendar`

- Admin UI: `/admin/astronomy-calendar`



## Gem



- Reason: `astronomy_event_observed` (20 gem base, seasonal multiplier)

- Idempotent theo `entityId` = `eventId`

