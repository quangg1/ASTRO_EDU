# Use case ↔ codebase — Cosmo Learn

Ma trận đối chiếu **sơ đồ use case UML** với code. Sơ đồ được sinh tự động từ cùng danh mục này.

| Tài nguyên | Đường dẫn |
|----------|-----------|
| Sơ đồ (mở bằng draw.io) | [`UC Diagram.drawio`](../UC%20Diagram.drawio), [`docs/diagrams/UC-Diagram.drawio`](diagrams/UC-Diagram.drawio) |
| Tái sinh sơ đồ | `npm run diagrams:uc` |

**Cách đọc sơ đồ:** 9 tab — **01 Overview**, **02–08** domain, **09 Agent (Cosmo)**. Mỗi tab ~1100px; zoom 100–150%.

**Đồng bộ catalog:** `FinalReport.docx.md` §3.4.2 liệt kê **50 UC (UC-01 … UC-50)**. Sơ đồ sinh từ `scripts/generate-uc-diagram.mjs` — mảng `CATALOG_UC50` map 1:1 với oval trên draw.io. Chạy `npm run diagrams:uc` sẽ **fail** nếu thiếu/thừa oval so với catalog.

| Nguồn | Vai trò |
|-------|---------|
| `CATALOG_UC50` trong `generate-uc-diagram.mjs` | Danh mục chuẩn (50 dòng) |
| `packages[].ucs` | Oval trên từng tab sơ đồ |
| `links` | Actor ↔ UC (Guest không có profile — phải login) |
| `docs/use-case-coverage.md` | Route/code + ma trận actor |
| `FinalReport` §3.4.3 | Spec chi tiết (một phần + extended) |

**Actors:** Guest, Moderator, Admin, Student, **Teacher** (generalization → Student, kế thừa mọi UC của Student).

**Quan hệ trên sơ đồ**

| Quan hệ | Ví dụ |
|---------|--------|
| `<<extend>>` | View Lesson → View Course; Take Quiz / Assignment → Lesson; Study LP → View LP; Contextual Quiz → Sky / 3D; Concept Quiz / Rate Reply / Guest demo → Chat; Recall Quiz → Lesson; Onboarding → 3D |
| `<<include>>` | Pay Order → Enroll in Course |

---

## 1. Authentication & Account

| Use case | Actors | Route / code |
|----------|--------|----------------|
| Register | Guest | `/register`; OAuth alt. → Firebase `POST /auth/firebase` |
| Log In / Log Out | Guest, Moderator, Admin, Student, Teacher | `/login`, JWT session; OAuth alt. same as Register |
| Reset Password | Guest, Student | `/forgot-password`, `/reset-password` |
| Deactivate Own Account | Student, Teacher, Moderator, Admin | `/profile`, `DELETE /auth/me` |
| View / Update Profile | Student, Teacher, Moderator, Admin | `/profile`, `PATCH /auth/me`, `/api/users/me/learner-profile`, `/auth/teacher-profile/me` |
| Change Password | Student, Teacher, Moderator, Admin | `/profile`, `POST /auth/change-password` (local accounts) |

---

## 2. Courses & Enrollment

| Use case | Actors | Route / code |
|----------|--------|----------------|
| Browse & Search Courses | Guest, Moderator, Admin, Student | `/courses`, `GET /courses?q=` |
| View Learning Path | Guest, Student | `/tutorial`, `/dashboard`, `learning-path` |
| View Course Details | Guest, Student | `/courses/[slug]` |
| View Lesson Content | Student | `/courses/.../learn/[lessonSlug]`, cohort routes |
| Enroll in Course | Student | Catalog only (`catalogEnabled`): free → `POST /courses/:slug/enroll` in learn viewer; paid → UC-12. **Not** for `instructor_led` (`403 catalog_disabled`). Strategies: `self_paced` / `hybrid` / `instructor_led` — see `distributionStrategy.js` |
| Join Cohort | Student | `CourseCohortsJoin`, `POST …/cohorts/enroll`; paid / hybrid upgrade → checkout `?cohortId=`. Required for `instructor_led`; optional on `hybrid` |
| Pay Order | Student | `/courses/[slug]/checkout`, `features/payment` (demo checkout) |
| Apply as Teacher | Student | `/apply-teacher` |
| Take Recall Quiz | Student | `LessonRecallQuizOverlay`, LP |
| View My Orders | Student | `/my-orders` |
| Take Quiz (lesson) | Student | quiz lesson blocks, `/courses/.../exam/...` |
| Submit Assignment | Student | `AssignmentSubmit`, cohort/catalog assignment routes |
| Track Learning Progress | Student | `/dashboard`, `/my-courses`, enrollment progress |
| Study Tutorial In-Depth | Guest, Student | `/tutorial/[moduleId]/…`, `LearningLessonView` |

---

## 2b. Course distribution strategy (Studio)

Teacher sets **`distributionStrategy`** per course (Studio → Distribution). This gates which enrollment UCs apply:

| Strategy | `catalogEnabled` | UC-11 Enroll (catalog) | UC-13 Join Cohort | Typical UI |
|----------|------------------|--------------------------|-------------------|------------|
| `self_paced` | true | ✅ Free/paid catalog | Hidden unless cohorts exist | `/courses` + learn viewer |
| `instructor_led` | false | ❌ `403 catalog_disabled` | ✅ Required | Cohort picker only on landing |
| `hybrid` | true | ✅ Catalog + optional cohort later | ✅ Optional; upgrade checkout with catalog credit | Both blocks on landing |

Code: `services/api/features/courses/lib/distributionStrategy.js`, `client/.../distributionStrategy.ts`.

---

## 3. Explore & 3D Learning

| Use case | Actors | Route / code |
|----------|--------|----------------|
| View 3D Simulation | Guest, Student | `/explore?view=solar`, earth stages; optional first-visit guided tour (**Hướng dẫn**) — alternate flow, not separate UC |
| Explore Sky Planetarium | Guest, Student | `/explore?view=sky`, 88 chòm |
| Take Contextual Quiz | Student | `exploreContextualQuizService` — **API, không LLM agent** |
| Track Concept Mastery | Student | `features/learning-state` |

Cosmo / concept quiz → [§3b](#3b-ai-agent-cosmo--tab-09).

---

## 3b. AI Agent (Cosmo) — tab 09

Kiến trúc: [`docs/architecture/learning-agent.md`](architecture/learning-agent.md).

| Use case | Actors | Code |
|----------|--------|------|
| Chat with Cosmo Assistant | Guest (demo), Student, Teacher | `CosmoAssistantWidget`, `POST /api/agent/message`; guest `/api/chat` |
| Take Concept Quiz (agent) | Student | `concept-quiz/*`, `CosmoConceptQuizHost` — **<<extend>>** chat |
| Rate Agent Reply | Student | `POST /api/agent/feedback` — **<<extend>>** chat |

**System behavior (SRS / `learning-agent.md`):** navigation tools (`agentToolSchema.json`), `search_learning_content`, coach nudge (`GET /api/agent/coach-nudge`) — invoked inside UC-26 pipeline, not separate use cases.

Chat **khóa** khi Recall/Exam. Widget toàn app (`layout.tsx`).

---

## 4. Community

| Use case | Actors | Route / code |
|----------|--------|----------------|
| Browse Community / News | Guest, Moderator, Student | `/community`, news crawl |
| Post & Comment | Student | forums, `/community/[slug]` |
| Report Content | Student, Moderator | báo cáo → moderation queue |
| Moderate Content | Moderator, Admin | `/dashboard/moderate`, `/admin/moderation` |
| Direct Messages | Student | `/messages` |

---

## 5. Rewards & Notifications

| Use case | Actors | Route / code |
|----------|--------|----------------|
| Gem Shop & Avatar | Student | `/gem-shop`, `features/rewards` |
| Earn & Spend Gems | Student | explore rewards, LP, quiz |
| Solar Journey Milestones | Student | `solarJourneyProgress`, CDN media |
| View Notifications | Student | `/notifications` |

---

## 6. Studio (Teacher)

Teacher **kế thừa** Student; thêm:

| Use case | Route / code |
|----------|----------------|
| View Studio Dashboard | `/studio` |
| Create / Edit Course | `/studio/[slug]` — course metadata |
| Create / Edit Lesson | `/studio/[slug]` — BlockEditor |
| Manage Cohort | `/studio/[slug]` — cohort tab |
| Make Quiz | studio lesson tab Quiz |
| Manage Concepts | `/studio/concepts` |
| Manage Learning Path | `/studio/learning-path` |
| Showcase Entity Studio | `/studio/showcase-entities` |

---

## 7. Administration

| Use case | Route / code |
|----------|----------------|
| Manage User | `/admin/users`, `/admin/users/[id]` — role, `send-password-reset`, deactivate/restore (`updateUserStatus`) |
| Manage Order | `/admin/orders` |
| Approve / Reject Teacher | `/admin`, `reviewTeacherApplication` |
| Manage Gem Economy | `/admin/gem-economy` |
| Promo & Broadcast | `/admin/promo-codes`, `/admin/broadcast` |
| Platform Analytics, Audit & System | `/admin` (analytics tabs), `/admin/audit`, `/admin/system`; GA4 via `NEXT_PUBLIC_GA_ID` + `trackEvent` (external GA console) |

Admin moderation dùng chung **UC-32 Moderate Content** (tab Community), không tách oval riêng trên tab Admin.

Admin cũng **Log In**, **Browse** (cùng Moderator/Student).

---

## 8. Kết nối actor (đã vẽ trên sơ đồ)

| Actor | Liên kết bổ sung so với sơ đồ cũ |
|-------|-----------------------------------|
| Guest | Explore Sky, Community browse, View Course (preview) |
| Moderator | Browse, Report, Community browse |
| Admin | Browse, Log In, Gem/Promo/Audit, Admin moderation |
| Student | Browse, View LP, toàn bộ Explore/Rewards/Community |
| Teacher | Generalization → Student; 6 UC Studio riêng |

---

## 9. Ngoài phạm vi UC (chi tiết kỹ thuật)

| Hạng mục | Ghi chú |
|----------|---------|
| ReAct loop / quota / rate limit | bên trong pipeline `messagePipeline` / `reactLoop` |
| Media CDN (`public/sky`) | hạ tầng Explore |
| Tutorial naming vs Course+LP | product doc |

---

*Cập nhật sơ đồ: chỉnh `scripts/generate-uc-diagram.mjs` rồi chạy `node scripts/generate-uc-diagram.mjs`.*
