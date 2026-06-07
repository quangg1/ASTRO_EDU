# Hệ thống 3D + lộ trình nội dung — kiến trúc & triển khai

Tài liệu gói toàn bộ stack Explore 3D hiện tại, cách nó nối với lộ trình học (LP), gem economy, và lộ trình triển khai nội dung.

**Liên quan:** `docs/plans/gem-rewards-system.md`, `client/src/app/explore/README.md`, `client/src/components/3d/showcase/SHOWCASE_TECH_NOTES.md`

---

## 1. Tổng quan — ba chế độ trên `/explore`

| Chế độ | URL / trigger | Scene 3D | Panel UI | Gem |
|--------|---------------|----------|----------|-----|
| **Showcase** | Mặc định | `ShowcaseScene` — hệ Mặt Trời, quỹ đạo JPL | `ShowcaseEntityPanel` + menu danh mục | Earn discovery (+5), spend story/orbit (chưa gate 3D) |
| **Earth fossil** | `?stage=` | `EarthScene` — timeline địa chất | `earth/ui/*` | Không earn DH (mode cũ) |
| **Lịch sử sâu** | `?history=1&entity=` | Earth: `EarthScene` + beat; khác: `PlanetHistoryScene` | `ExplorePlanetHistoryOverlay` + narrative dock | Earn beat (+4) / site (+2) — xem §5 |

Orchestration: `useExplorePage` → `ExplorePageContent` → `ExploreSceneCanvas` + overlay theo `sceneMode`.

---

## 2. Lớp dữ liệu & nội dung

```
Studio (CMS)                    API (Mongo)
├── showcase-entities           ShowcaseEntityContent (texture, model, panelConfig)
├── planet narrative editor       PlanetNarrativeBundle (beats, sites, linkedLessonIds)
└── showcase catalog bundle       ShowcaseCatalogBundle (catalog, orbits, stories[])

Runtime client
├── ShowcaseCatalogProvider → hydrate NASA_SHOWCASE_ITEMS, orbits
├── mergeShowcaseCatalog → resolvedCatalog + mergedOrbitEntities (+ JPL)
├── resolveExplorePanelConfig → tab/block mặc định (VI) khi CMS trống
└── showcaseLearningBridge → LP lesson/concept ↔ entity
```

### Nguồn sự thật theo loại nội dung

| Loại | SSOT | Chỉnh ở đâu |
|------|------|-------------|
| Danh sách thiên thể | `ShowcaseCatalogBundle.catalog` | Studio catalog / seed JSON |
| Quỹ đạo 3D | `orbits` + JPL sync | Studio + `sync-showcase-jpl-orbits.js` |
| Panel trái Explore | `ShowcaseEntityContent.panelConfig` | Studio → Panel content |
| Deep History beats | `PlanetNarrative` per entity | Studio → Narrative |
| Bài LP gắn entity | `sceneContext` + `linkedLessonIds` | LP editor + narrative CMS |
| Story campaigns | `ShowcaseCatalogBundle.stories` (+ `waypoints[]`) | Studio catalog / seed JSON |

---

## 3. Cầu nối lộ trình học (Learning Path bridge)

Luồng khi user focus entity ≥ 3s (`useExploreLearningBridge`):

1. Emit `scene_entity_focus_duration`, `scene_concept_overlay_shown`
2. Lần đầu entity → `scene_entity_discovered` (+5 gem nếu đủ điều kiện LP)
3. Gắn `visited3D` cho bài LP map entity
4. Sau +3s → contextual quiz (`ExploreBridgeQuiz`)

Panel hiển thị:

- Tab **Tổng quan / Vật lý / Bầu trời** — CMS hoặc auto-fill
- Footer **Lộ trình học** — `resolveAllLessonsForEntity`
- Nút **Lịch sử sâu** — khi entity có beats (preset hoặc DB)

---

## 4. Gem economy trên Explore

| Hành vi | Gem | Trạng thái |
|---------|-----|------------|
| Khám phá entity mới (focus 3s) | +5 | ✅ |
| Deep History — xem beat ≥30s | +4 | ✅ (`useDeepHistoryGemRewards`) |
| Deep History — mở site/pin | +2 | ✅ (planet có sites; Earth hóa thạch chưa map) |
| Unlock story | −40 | ✅ Story tour player + unlock UI |
| Unlock orbit | −55 | ✅ Orbit gate 3D (hành tinh + moon-luna free) |

Nút story/orbit trên panel đã **khôi phục** (`ShowcaseEntityPanel` + `showcaseGamificationApi`).

---

## 5. Deep History — earn gem (chi tiết)

**Mở Lịch sử sâu = miễn phí.** Gem chỉ **cộng** khi:

- Đăng nhập
- Ở trong overlay Lịch sử sâu
- **+4:** giữ nguyên một beat ≥ 30 giây (tối đa 5 beat/session, cap tuần)
- **+2:** mở pin/site narrative lần đầu (entity có `sites` trong bundle)

Client: `useDeepHistoryGemRewards` → `trackLearningPathBehavior` → `POST /learning-path/events/batch` → `rewardEngine`.

**Gap Earth:** click hóa thạch chưa emit `deep_history_site_opened` — cần map fossil → siteId (Phase C).

---

## 6. Dọn dẹp đã làm (2026-05-29)

| Mục | Hành động |
|-----|-----------|
| `NarrativeTimeline`, `NarrativeInfoPanel`, `NarrativeControls` | Xóa — thay bằng `NarrativeBottomDock` + beat detail dock |
| `bridgeOverlayOpen` / `bridgeOverlayEntityId` | Xóa state không dùng |
| `setPlanetHistoryEntityId` noop | Xóa |
| `ShowcaseScene` `showPlanet` dead branch | Gỡ |
| Chuỗi EN panel/overlay mặc định | Việt hóa (`resolveExplorePanelConfig`, panel, overlay) |
| Nút Mở story/orbit | Ẩn tạm (misleading) |

---

## 7. Lộ trình triển khai nội dung & hệ thống

### Phase A — Ổn định nền (1–2 tuần)

- [ ] Việt hóa nhãn 3D trên canvas (planet `nameVi` nếu có)
- [ ] Hint earn trên header Lịch sử sâu: *“Ở lại giai đoạn 30s → +4 Gem”*
- [ ] Wire Earth fossil click → `deep_history_site_opened`
- [ ] Test E2E: DH dwell → toast + balance `/gem`
- [ ] Gom import `@/lib/showcaseEntities` → `@/features/content3d/showcase` (bỏ shim deprecated)

### Phase B — Showcase premium (story + orbit gate)

- [x] **Story viewer:** UI đọc `NASA_SHOWCASE_STORIES` + CMS; campaign theo `targetPlanetName`
- [x] **Orbit gate:** filter `mergedOrbitEntities` khi `!orbitUnlocked` (giữ hành tinh cha + Moon cơ bản)
- [x] Khôi phục UI mở khóa story/orbit trên `ShowcaseEntityPanel` (dùng `showcaseGamificationApi`)
- [x] Post-unlock: camera preset / highlight entity mới mở

### Phase C — Lộ trình nội dung theo module LP

Map từng module LP → entity showcase → Deep History:

| Module LP (ví dụ) | Entity showcase | Lịch sử sâu | Ghi chú |
|-------------------|-----------------|-------------|---------|
| Hệ Mặt Trời | planet-* | Mars, Earth | Earth = hóa thạch |
| Mặt Trăng & nhiệm vụ | moon-luna, sc-artemis* | — | Story Artemis |
| Sao chổi | comet-* | — | Model GLB từ Studio |

Quy trình authoring:

1. Studio: entity content (texture, panel VI, museumBlurbVi)
2. Studio: narrative beats (nếu có Lịch sử sâu)
3. LP: `sceneContext.entityId` + `historyFocus` trên bài
4. QA: Explore → panel → Lịch sử sâu → LP link vòng lại

### Phase D — Agent & đánh giá

- [x] Agent `focus_showcase_entity` + `assertShowcaseEntityAccess` (LP / gem / public catalog)
- [x] Client toast khi tool bị từ chối (`no_access`, `auth_required`)
- [x] `scene_contextual_quiz_passed` (+3 Gem, đúng hết, 1×/entity/ngày VN, cần ≥1 bài LP)
- [ ] Achievement seed cho DH / discovery

### Phase E — Deduplicate Earth paths (tùy chọn)

Hai entry Earth (`?stage=` fossil vs `?history=1` Lịch sử sâu) — cân nhắc redirect fossil cũ → Lịch sử sâu Earth hoặc gộp store.

---

## 8. File map nhanh (dev)

| Concern | Path |
|---------|------|
| Page compose | `app/explore/hooks/useExplorePage.ts` |
| Panel trái | `components/3d/showcase/ShowcaseEntityPanel.tsx` |
| Panel config auto | `features/content3d/showcase/lib/resolveExplorePanelConfig.ts` |
| Scene showcase | `components/3d/showcase/ShowcaseScene.tsx` |
| DH overlay | `app/explore/components/ExplorePlanetHistoryOverlay.tsx` |
| DH gem client | `app/explore/hooks/useDeepHistoryGemRewards.ts` |
| Story tour UI | `app/explore/components/ExploreStoryTourOverlay.tsx` |
| Showcase gamification hook | `app/explore/hooks/useExploreShowcaseGamification.ts` |
| Orbit gate | `features/content3d/showcase/lib/filterShowcaseOrbits.ts` |
| Gem unlock API | `services/api/features/rewards/routes/showcaseGamification.js` |
| Reward engine | `services/api/features/rewards/services/rewardEngine.js` |
| Studio CMS | `app/studio/showcase-entities/` |

---

## 9. Audit changelog

| Ngày | Nội dung |
|------|----------|
| 2026-05-29 | Tạo doc; dead code pass; Việt hóa panel mặc định; ẩn unlock story/orbit |
