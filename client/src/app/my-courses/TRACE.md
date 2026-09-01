# `/my-courses` — TRACE

Learner hub: enrolled courses progress + learning-path snapshot + recent orders summary.

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Thin `'use client'` shell → `@/features/courses/public` |
| `@/features/courses/ui/my-courses/MyCoursesPage.tsx` | Full dashboard UI |

## Features

| Domain | Via | Used for |
|--------|-----|----------|
| `courses` | `public` | `fetchMyCourses` |
| `learning-path` | `public` | Progress maps, module % , last lesson, sync completion |
| `payment` | `public` | `fetchMyOrders`, order status labels |
| `auth` | `public` | Require login |

## Backend mounts (primary)

- `GET /api/courses/my` — enrollments + lesson progress
- `GET /api/learning-path` (+ completion / behavior helpers used by LP hooks)
- `GET /api/payments/orders` — order history strip
- Auth session via `/auth/*`

## Notes

- LP section uses curriculum helpers from `@/data/learningPathCurriculum` (`getLessonById`) with live modules from `useLearningPath`.
- Money formatting via `@/lib/money`; live clock via `@/hooks/useLiveClock`.
