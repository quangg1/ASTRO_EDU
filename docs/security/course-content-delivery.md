# Course content delivery security

Protects quiz answer keys and enforces **single delivery context** (catalog vs cohort) for learners.

## Layer: `courseContentSecurity.js`

| Export | Role |
|--------|------|
| `redactLessonsForLearnerDelivery` | Strip `answer`, `explanation`, `optionExplanations` from `quizQuestions` before JSON leaves the API |
| `viewerMaySeeQuizSecrets` | `true` only for course editors (teacher owner / admin) |
| `resolveDeliveryContext` | `{ mode: catalog \| cohort \| editor }` for the authenticated user |
| `assertQuizDeliveryAccess` | Exam routes: block catalog when user has any cohort enrollment on the course |
| `assertAssignmentDeliveryAccess` | Assignment routes: same cohort-context rules |

## Where redaction runs

- `GET /courses/:slug` — full lesson bodies for enrolled learners, **without** quiz secrets (unless editor preview).
- `GET /courses/:slug?outline=1` — already outline-only (no question bodies).
- `GET /courses/:slug/editor` — **not** redacted (Studio).

## Where cohort context is enforced

- All `/courses/:slug/exam/:lessonSlug/*` handlers (session, attempts, submit, confirm).
- All `/courses/:slug/assignment/:lessonSlug/*` handlers (draft, staging, submit).

Error codes:

- `cohort_context_required` — learner in a class tried catalog exam/assignment.
- `wrong_cohort` — cohort route does not match enrollment.
- `quiz_locked` / `quiz_closed` — cohort schedule window.

## Client

- `Course.deliveryContext` from API drives routing in `CoursePageClient` and `useCohortDeliveryRedirect` on catalog exam/assignment pages.

## Answers revealed only via exam submit

- `/exam/.../session` uses `sanitizeQuestionForClient` (no answers).
- `POST .../submit` returns `perQuestion` with `correctIndex` when `revealMode` allows.

## Deploy checklist

1. Restart API after deploy (new service module).
2. Smoke: enrolled learner `GET /courses/:slug` — Network tab must not contain `"answer":` inside `quizQuestions`.
3. Smoke: cohort student opening `/courses/:slug/exam/...` → `403` + `cohort_context_required`.
4. Smoke: same student via `/cohort/:id/exam/...` when schedule open → session OK.

## Future (P2)

- Cohort override for `revealMode` (`after_deadline`, `never` for class integrity).
- Time-lock on `/learn` for cohort-only text/visualization lessons.
