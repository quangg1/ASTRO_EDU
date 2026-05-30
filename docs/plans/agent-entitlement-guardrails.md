---
title: Agent Entitlement & Guardrails — Audit
status: active
parent: docs/plans/learning-agent-system.md
updated: 2026-05-21
---

# Agent Entitlement & Guardrails — Audit (2026-05-21)

Tài liệu audit bổ sung cho **Learning Agent Platform**. Chi tiết triển khai: [`learning-agent-system.md`](./learning-agent-system.md) §3.5–§3.7, §9.0 (Phase 0 sprint), checklist 0.8–0.10 bên dưới.

## Ma trận entitlement (5 tier)

| Dimension | 👤 Guest | 🎓 LP/Free | ⏱ Trial (gem) | ✅ Enrolled | 👨‍🏫 Teacher |
|-----------|----------|------------|---------------|------------|-------------|
| System prompt | Demo 2 câu | Tutor chung | Course agent (scoped module) | Course agent full | Instructor view |
| Context snapshot | Không | LP progress, concepts | Module hiện tại + quiz fail (module) | Syllabus + tiến độ + quiz fail (không full blocks) | Analytics + class progress |
| Tools | Không | `suggest_lesson` (link only) | `open_lesson` (module scope) | `open_lesson`, `navigate_to_narrative`, `start_recall_quiz` | All + `view_student_progress` |
| RAG corpus | Không | General + LP snippets | Module corpus only | General + full course | General + course + instructor notes |
| Rate limit | 2 câu demo | 40 msg/h | 40 msg/h | 60 msg/h | 120 msg/h |
| Fallback | — | — | Downgrade → LP khi trial hết | — | — |

**Trial** và **Teacher** phải có trong `entitlementResolver` từ Phase 0 — không gắn sau khi tool/RAG đã ship.

## Hiện trạng code (gap)

| Hạng mục | Hiện có | Thiếu |
|----------|---------|-------|
| Chat + tools | `services/ai/agent_tools.py`, **`CosmoAssistantWidget`**, `features/agent`, `/api/agent/message` | LangGraph graph đầy đủ; trial `Enrollment` migration |
| Enrollment | `Enrollment` chỉ `progress[]`, không `status`/`trial*` | Migration trial từ gem shop |
| Tool auth | Python validate shape | Node authorize enrollment + showcase |
| Orchestration | `features/agent` message pipeline + `services/ai` LLM | LangGraph graph đầy đủ (§3.7 parent doc) |

## 5 improvements (severity)

### 🔴 Issue 1 — Tool validation server-side

**Risk:** Authorization bypass — LLM + client navigate lesson user chưa mua.

**Fix:** `services/api/features/agent/tools/executeOpenLesson.js` (và mọi tool) double-check `Enrollment` — không trust `sessionCtx` từ client.

```javascript
// Pseudocode — see parent doc §3.6.1
const enrolled = await Enrollment.findOne({ userId, courseId, status: { $in: ['active', 'trial'] } })
if (enrolled?.status === 'trial' && lesson.moduleId !== enrolled.trialModuleId) return { code: 'trial_scope' }
```

### 🟡 Issue 2 — Enrolled, câu hỏi ngoài syllabus

**Policy:** Course RAG first; score < 0.6 → general corpus + disclaimer. Không hard-refuse câu khoa học hợp lệ.

### 🟡 Issue 3 — Snapshot không chứa full lesson blocks

Chỉ `sectionTitles`, `conceptTagIds`, quiz fail metadata. Full text qua RAG on-demand.

### 🔵 Issue 4 — Trial scope + graceful downgrade

```typescript
Enrollment { status: 'active' | 'trial' | 'expired'; trialModuleId?; trialExpiresAt? }
```

Mid-session expiry → `agentContext.mode = 'lp_free'` + user-visible banner.

### 🔵 Issue 5 — 3D tools: 2 checks

`navigate_to_narrative` / Explore: **course entity link** OR **showcase gem unlock** — độc lập enrollment.

## LangGraph (guardrails graph)

```
resolve_entitlement → build_context → rag_retrieve → llm_chat
  → validate_tools (Python) → authorize_tools (Node HTTP) → emit_response
```

- **Node** = authoritative auth + Mongo.
- **LangGraph** = branching policy, trial expiry, RAG hybrid, audit per step.

## Phase 0 checklist (entitlement)

- [ ] 0.8 `entitlementResolver` + tier matrix
- [ ] 0.9 `POST /api/agent/tools/execute` + executors
- [ ] 0.10 LangGraph skeleton + internal authorize node
- [ ] Enrollment migration (trial fields)
- [ ] Lesson/course routes giữ enrollment gate (agent không bypass)

## Liên kết

- Platform plan: `docs/plans/learning-agent-system.md`
- Gems / trial SKU: `docs/plans/gem-rewards-system.md` (cần align `trialModuleId`)
- Audit báo cáo: `docs/ARCHITECTURE_AUDIT.md` §3.8
