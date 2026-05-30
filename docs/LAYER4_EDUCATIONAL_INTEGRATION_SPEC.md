# Layer 4 Educational Integration Spec

## 1) Purpose

Build the missing Educational Integration Layer between:
- `Learning system` (lesson, concept, quiz, progress)
- `3D explore/showcase scene` (entity focus, camera interaction, discovery)

This layer is the product USP versus NASA Eyes: scene interactions must produce educational outcomes and measurable learning progress.

## 2) Goals and Non-Goals

- **Goals**
  - Make 3D interactions concept-aware.
  - Sync explore actions into learning progress semantics.
  - Trigger contextual quiz and concept overlays from scene events.
  - Provide authoring control via Studio (mapping, snapshots, rules, tags).
  - Keep runtime logic data-driven (no hardcoded educational logic in scene components).
- **Non-Goals (v1)**
  - Full adaptive tutoring policy engine.
  - Cross-course recommendation engine.
  - Multi-tenant authoring permissions beyond current role model.

## 3) Core Problems This Solves

1. **Content authority drift**  
   Scene entities and learning concepts/lessons currently evolve independently.
2. **Progress semantics mismatch**  
   "Visited in 3D" and "Mastered in lesson" are different but currently weakly connected.
3. **Navigation intent conflict**  
   Guided lesson context and free exploration context are not explicitly modeled.

## 4) High-Level Architecture

- **Existing**
  - Learning: content editor, quiz/progress, concept store
  - 3D: showcase store, camera/story, entity mesh layer
- **New Layer 4 (Content Bridge Studio + Runtime Bridge)**
  - Entity-concept map
  - Scene snapshot store
  - Trigger rule builder
  - Curriculum tagger
- **Shared Data Layer**
  - Entity-concept mappings
  - Snapshot definitions
  - Trigger rules
  - Curriculum tags
  - Explore activity + discovery records

## 5) Domain Model (v1)

### 5.1 EntityConceptMap

- `id: string`
- `entityId: string` (3D canonical id, e.g. `saturn`, `cassini_division`)
- `conceptIds: string[]`
- `lessonIds: string[]` (optional direct link)
- `tags: string[]` (e.g. `planet`, `rings`, `atmosphere`)
- `status: 'active' | 'deprecated'`
- `updatedBy`, `updatedAt`

### 5.2 SceneSnapshot

- `id: string`
- `name: string`
- `entityId: string`
- `camera: { target: [x,y,z], position: [x,y,z], dist: number, az: number, el: number }`
- `sim: { dateIso?: string, speed?: number, freeze?: boolean }`
- `lightingPreset?: string`
- `notes?: string`
- `updatedBy`, `updatedAt`

### 5.3 TriggerRule

- `id: string`
- `name: string`
- `enabled: boolean`
- `context: 'explore' | 'lesson' | 'any'`
- `if: RuleCondition[]`
- `then: RuleAction[]`
- `priority: number`

`RuleCondition` (v1):
- `event == 'entity_focus_duration'`
- `entityId in [...]`
- `durationSec >= N`
- optional `mode == showcase|explore`

`RuleAction` (v1):
- `show_concept_overlay`
- `mark_entity_visited`
- `sync_learning_path_visited`
- `prompt_contextual_quiz`
- `unlock_discovery_badge`

### 5.4 CurriculumTag

- `id: string`
- `lessonId: string`
- `entityIds: string[]`
- `conceptIds: string[]`
- `snapshotId?: string`
- `ctaText?: string` (e.g. "Bạn chưa khám phá Saturn trong 3D")

### 5.5 DiscoveryRecord

- `userId`
- `entityId`
- `firstSeenAt`
- `rarity: 'common' | 'rare' | 'epic'`
- `source: 'explore' | 'lesson_cta'`

## 6) Event Contract (Scene -> Learning Bridge)

### 6.1 Client Event Shape

```json
{
  "eventName": "scene_entity_focus_duration",
  "sessionId": "uuid",
  "userId": "optional",
  "timestamp": "ISO-8601",
  "mode": "showcase",
  "entityId": "saturn",
  "durationSec": 3.2,
  "metadata": {
    "cameraDist": 4.2,
    "source": "pointer|story|url"
  }
}
```

### 6.2 Required Runtime Behavior

- Debounce focus events with threshold (`>= 3s` default).
- Emit only when focus target is stable (avoid noise while camera transitioning).
- Batch send similar to existing learning path events.

## 7) Runtime Features (v1)

### 7.1 Concept Overlay Trigger

- Trigger: `showcaseStore.focusedEntity` stable for `>= 3s`.
- Action: slide-in panel with related concept cards from `EntityConceptMap`.
- Card click: deep-link to concept route.

### 7.2 Bidirectional Learning Path Sync

- Explore -> Learning:
  - When rule matches, mark related learning-path items as `visited_3d`.
- Learning -> Explore:
  - In lesson/path UI, show CTA if required entity not visited.
  - CTA jumps into scene with target entity + optional snapshot.

### 7.3 Contextual Quiz Prompt

- Trigger: dwell on mapped entity for X sec (configurable rule).
- Prompt: "Bạn vừa khám phá Saturn. Thử 2 câu hỏi nhanh?"
- Question source:
  - Pull from existing quiz system filtered by `entity/concept tags`.

### 7.4 Discovery and Badge

- First visit unlock per entity.
- Store in backend for authenticated user; local cache for anonymous fallback.
- Include rarity tiers (`Sedna/Eris` rarer).

### 7.5 Measurement Tool

- Select two entities in scene.
- Display:
  - current distance (AU + km)
  - light-time delay
  - relative orbital speed

### 7.6 Comparison Panel

- Focus entity -> compare vs Earth:
  - radius/diameter
  - mass
  - gravity
  - day length
  - year length

## 8) Studio Requirements (Authoring)

### 8.1 Entity-Concept Mapping UI

- Search entity + search concept/lesson.
- Multi-map with validation:
  - orphan concept link warning
  - missing entity warning

### 8.2 Snapshot Editor

- Open 3D preview, set camera/sim state, save snapshot.
- Attach snapshot to lesson/tag.

### 8.3 Rule Builder UI

- IF/THEN form (no code required).
- Rule test sandbox with sample event playback.

### 8.4 Curriculum Tagger

- Attach entity/concept/snapshot metadata to lesson.
- Drive lesson CTA and contextual quiz filtering.

## 9) API Surface (Proposed)

- `GET /api/bridge/entity-concept-map`
- `PUT /api/bridge/entity-concept-map`
- `GET /api/bridge/snapshots`
- `POST /api/bridge/snapshots`
- `GET /api/bridge/rules`
- `PUT /api/bridge/rules`
- `POST /api/bridge/events/batch`
- `GET /api/bridge/discovery`
- `POST /api/bridge/discovery/unlock`
- `GET /api/bridge/measurement?entityA=...&entityB=...`
- `GET /api/bridge/comparison/:entityId?baseline=earth`

## 10) Data Ownership and Source of Truth

- 3D entity canonical ids: scene data catalog.
- Concept canonical ids: concept store.
- Mapping/rules/tags/snapshots: bridge layer database (single source for integration logic).
- Learning progress status:
  - keep existing `completed/mastered`
  - add `visited3d` namespace to avoid semantic collision.

## 11) Performance and Reliability

- Debounce + threshold to reduce event flood.
- Rule evaluation server-side for consistency.
- Cache concept overlays by `entityId`.
- Idempotency on `visited/discovery` writes.
- Fail-safe: if bridge API down, scene still works; defer sync and retry.

## 12) Security / Permissions

- Read bridge data: authenticated learner (or public read subset).
- Write mapping/rules/snapshots/tags: `teacher|admin`.
- Event ingestion: authenticated token + rate limits.

## 13) Telemetry and KPIs

- `overlay_shown`, `overlay_card_clicked`
- `scene_quiz_prompt_shown`, `scene_quiz_started`, `scene_quiz_completed`
- `entity_discovered`
- `learning_cta_to_scene_clicked`
- KPI examples:
  - % users with >= 1 `visited3d`
  - conversion from explore -> quiz attempt
  - lesson completion uplift for mapped entities

## 14) Rollout Plan

### Sprint 1 (Foundation)

- EntityConceptMap + event ingestion + visited3d sync.
- Basic overlay panel and learning CTA back-link.

### Sprint 2 (Authoring + Engagement)

- Snapshot store + Curriculum tagger.
- Rule Builder v1 (focus-duration rules).
- Discovery unlock.

### Sprint 3 (Learning Depth)

- Contextual quiz prompt from scene.
- Measurement tool and comparison panel.

## 15) Acceptance Criteria (v1)

- Focusing `saturn` for >= 3s emits one stable event and opens mapped concept overlay.
- Visiting mapped entities updates `visited3d` on learning-path item.
- Lesson CTA appears when required entity not visited; clicking CTA opens scene target.
- First-time entity visit unlocks one discovery record (idempotent).
- Rule changes in Studio reflect runtime behavior without scene code edits.

## 16) Open Questions

- Should anonymous users get temporary discovery sync across devices?
- Should `visited3d` decay/reset per course cohort or remain lifetime?
- Do we need prerequisite gating between scene quizzes and lesson mastery?

