# `/explore` — hub 3D & lộ trình nội dung

Một route, hai **tầng nhìn** (`?view=solar` | `?view=sky`) và ba engine scene trong solar (Earth fossil, Lịch sử sâu, showcase hệ Mặt Trời). Sky = **La bàn chòm sao** (vòm bầu trời, chung `entityId` / learning bridge với solar).

**Kiến trúc đầy đủ & lộ trình triển khai:** [`docs/plans/3d-learning-system.md`](../../docs/plans/3d-learning-system.md)

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Suspense shell only |
| `ExplorePageContent.tsx` | Layout + mode switch (earth / planet-history / showcase) |
| `hooks/useExplorePage.ts` | Composes domain hooks |
| `hooks/useExploreModeState.ts` | URL: `view`, `target`, `?stage`, `?history`, entity |
| `hooks/useExploreSkyCatalog.ts` | `GET /api/explore/sky-targets` + fallback |
| `hooks/useExploreViewNavigation.ts` | Chuyển solar ↔ sky, cross-link entity |
| `hooks/useExploreShowcaseCatalog.ts` | CMS + JPL catalog merge |
| `hooks/useExploreEarthMode.ts` | Stages, fossils, stage URL sync |
| `hooks/useExplorePlanetHistoryMode.ts` | Planet narrative load + LP lesson links |
| `hooks/useExploreShowcaseNav.ts` | Entity selection, camera URL, accent |
| `hooks/useExploreRewards.ts` | Gems + showcase unlock strip |
| `hooks/useExploreLearningBridge.ts` | Focus overlay, discovery, contextual quiz |
| `components/ExploreSkyOverlay.tsx` | Panel sky + toggle view |
| `components/ExploreViewToggle.tsx` | Hệ Mặt Trời / La bàn chòm sao |
| `components/*` | Presentational overlays + canvas |
| `@/features/explore` | Target types, URL helpers, sky API client |
| `@/components/3d/sky/SkyPlanetariumScene.tsx` | Vòm Three.js (MVP) |

## Onboarding tour

- Steps: `lib/exploreTourSteps.ts` (spotlight targets via `data-explore-tour` on panel, scene, catalog, quiz zone).
- UI: `components/ExploreOnboardingTour.tsx` — auto-opens once per browser (`lib/exploreTourPrefs.ts`) or from `?from=onboarding`; reopen via **Hướng dẫn** on the top bar.

## Learning panel (Showcase)

- **Bước học:** `ExploreLearningSteps.tsx` + `useExplorePanelLearning.ts` — checklist đọc → quiz → LP → Cosmo.
- **Chip concept:** mastery / “Cần ôn” từ `GET /api/learning-state/concepts`; bấm → quiz concept (`POST /api/agent/concept-quiz/start`), bài LP, hoặc Cosmo.

## Adding a feature

1. Pick the hook that owns the concern (or add `useExplore*.ts`).
2. Extend `useExplorePage` return type if the UI needs new data.
3. Wire UI in the matching `Explore*Overlay` or `ExploreSceneCanvas` — avoid growing `page.tsx`.
4. New tour targets: add `data-explore-tour="…"` and a step in `exploreTourSteps.ts`.
