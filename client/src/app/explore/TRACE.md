# `/explore` — TRACE

One route, two view modes (`?view=solar` | `?view=sky`) and three solar engines (Earth fossil, deep history / planet narrative, showcase solar system). Sky = constellation compass (shared `entityId` / learning bridge with solar).

**Full architecture & roadmap:** [`docs/plans/3d-learning-system.md`](../../../../docs/plans/3d-learning-system.md)

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Suspense shell only (~20 LOC) |
| `ExplorePageContent.tsx` | Layout + mode switch (earth / planet-history / showcase) |
| `hooks/useExplorePage.ts` | Composes domain hooks |
| `hooks/useExploreModeState.ts` | URL: `view`, `target`, `?stage`, `?history`, entity |
| `hooks/useExploreSkyCatalog.ts` | `GET /api/explore/sky-targets` + fallback |
| `hooks/useExploreViewNavigation.ts` | Solar ↔ sky, cross-link entity |
| `hooks/useExploreShowcaseCatalog.ts` | CMS + JPL catalog merge |
| `hooks/useExploreEarthMode.ts` | Stages, fossils, stage URL sync |
| `hooks/useExplorePlanetHistoryMode.ts` | Planet narrative load + LP lesson links |
| `hooks/useExploreShowcaseNav.ts` | Entity selection, camera URL, accent |
| `hooks/useExploreRewards.ts` | Gems + showcase unlock strip |
| `hooks/useExploreLearningBridge.ts` | Focus overlay, discovery, contextual quiz |
| `components/*` | Presentational overlays + canvas |
| `@/features/explore` | Target types, URL helpers, sky API client |
| `@/features/content3d/{earth,showcase,narrative}/ui` | Domain 3D panels |
| `@/components/3d/sky/SkyPlanetariumScene.tsx` | Sky dome (Three.js) |

## Features / backend (primary)

| Concern | Feature | API |
|---------|---------|-----|
| Sky targets | `explore` | `GET /api/explore/sky-targets` |
| Showcase catalog / entities / orbits | `content3d/showcase` | `/api/showcase-catalog`, `/api/showcase-entities`, `/api/showcase-orbits` |
| Contextual quiz | `content3d/showcase` | `GET /api/explore/contextual-quiz` |
| Earth stages / fossils | `content3d/earth` | `/api/earth-history`, `/api/fossils`, `/api/phyla` |
| Learning bridge / LP links | `learning-path`, `learning-state` | `/api/learning-path`, `/api/learning-state/concepts` |
| Gems / unlocks | `rewards` | `/api/gems`, `/api/showcase` (gamification) |
| Cosmo / concept quiz | `agent` | `/api/agent/*` |

## Onboarding tour

- Steps: `lib/exploreTourSteps.ts` (`data-explore-tour` targets).
- UI: `components/ExploreOnboardingTour.tsx` — once per browser (`lib/exploreTourPrefs.ts`) or `?from=onboarding`; reopen via **Hướng dẫn**.

## Learning panel (Showcase)

- Steps: `ExploreLearningSteps.tsx` + `useExplorePanelLearning.ts`.
- Concept chips: mastery / “Cần ôn” from `GET /api/learning-state/concepts`; actions → concept quiz, LP lesson, or Cosmo.

## Adding a feature

1. Own the concern in a `useExplore*.ts` hook (or extend an existing one).
2. Extend `useExplorePage` return type if the UI needs new data.
3. Wire UI in the matching overlay / canvas — keep `page.tsx` thin.
4. New tour targets: `data-explore-tour="…"` + step in `exploreTourSteps.ts`.

See also: [`README.md`](./README.md) in this folder.
