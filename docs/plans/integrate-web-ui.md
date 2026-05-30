# Tích hợp UI từ `origin/origin/feature/web-ui`

**Nguyên tắc:** Chỉ lấy markup / style / layout từ nhánh UI. Logic, API, agent, explore giữ từ nhánh hiện tại (`main` + WIP).

## Ref nhánh

```text
origin/origin/feature/web-ui
```

(Sau `git fetch origin` — tên remote-tracking có prefix kép.)

## Không checkout / luôn giữ bản hiện tại

| Path | Lý do |
|------|--------|
| `client/src/app/layout.tsx` | `CosmoAssistantWidget` thay `AITutor` |
| `client/src/app/explore/**` | Agent + canvas pointer |
| `client/src/components/learning-path/LearningLessonView.tsx` | Agent, coach, quiz, `openCosmoAssistant` |
| `client/src/features/agent/**` | Toàn bộ agent platform |
| `client/src/components/ai-tutor/CosmoAssistantWidget.tsx` | Widget thống nhất |
| `client/src/components/ai-tutor/AssistantMarkdown.tsx` | |
| `client/src/components/3d/showcase/ShowcaseScene.tsx` | Explore click fix |
| `client/src/app/admin/page.tsx` | Tab Agent analytics |
| `services/**`, `shared/agent/**` | Backend / agent SSOT |
| `client/src/app/studio/[slug]/page.tsx` | Cohort / delivery WIP |

## Wave 1 — Checkout an toàn (chỉ UI shell)

- `client/src/app/globals.css` → merge tay phần `cosmo-assistant-portal` sau checkout
- `client/src/components/landing/**`
- `client/src/components/ui/AppHeader.tsx` → wired via `AppChrome`; logic từ `layout/AppHeader` (nav config, roles, notifications, avatar)
- `client/src/components/layout/DashboardShell.tsx`
- Trang: `page.tsx`, `courses/page.tsx`, `dashboard/**`, `community/**`, `login`, `register`, `profile`, `my-courses`, `search`, `gem/**`, `apply-teacher`
- `client/src/components/community/News*`
- `client/src/components/auth/FirebaseAuthButtons.tsx`

## Wave 2 — LP / courses (merge tay hoặc wave riêng)

**Done (UI web-ui + logic main):**

- `LearningPathHub`, `LearningModuleView`, `LearningNodeView`, `NodeDepthPanel` — sci-fi shell; imports `@/features/learning-path/public`; hub giữ link knowledge-map; depth panel giữ mastery + explore 3D CTAs
- `CoursePageClient` — HUD sidebar/shell; giữ `CommunityAskButton`, tutor context, explore redirect, enrollment/checkout logic
- `LessonContentBody` — HUD chamfer sections; giữ `SectionPreview`, earth 3D embed

**Không đụng:**

- `LearningLessonView.tsx` — agent + coach + quiz

**Còn optional:**

- `QuizLessonBlock`, `CourseLandingClient`, studio list pages — restyle nhẹ nếu cần

## Sau mỗi wave

```powershell
cd client
npm run build
```

## Lệnh checkout một nhóm

```powershell
git checkout origin/origin/feature/web-ui -- client/src/components/landing/
```
