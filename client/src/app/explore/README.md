# `/explore` — 3D hub orchestration

Single route that switches three scene engines (Earth history, planet deep-history, solar showcase).

## Layout

| Path | Role |
|------|------|
| `page.tsx` | Suspense shell only |
| `ExplorePageContent.tsx` | Layout + mode switch (earth / planet-history / showcase) |
| `hooks/useExplorePage.ts` | Composes domain hooks |
| `hooks/useExploreModeState.ts` | URL + mode flags (`?stage`, `?history`, entity) |
| `hooks/useExploreShowcaseCatalog.ts` | CMS + JPL catalog merge |
| `hooks/useExploreEarthMode.ts` | Stages, fossils, stage URL sync |
| `hooks/useExplorePlanetHistoryMode.ts` | Planet narrative load + LP lesson links |
| `hooks/useExploreShowcaseNav.ts` | Entity selection, camera URL, accent |
| `hooks/useExploreRewards.ts` | Gems + showcase unlock strip |
| `hooks/useExploreLearningBridge.ts` | Focus overlay, discovery, contextual quiz |
| `components/*` | Presentational overlays + canvas |

## Adding a feature

1. Pick the hook that owns the concern (or add `useExplore*.ts`).
2. Extend `useExplorePage` return type if the UI needs new data.
3. Wire UI in the matching `Explore*Overlay` or `ExploreSceneCanvas` — avoid growing `page.tsx`.
