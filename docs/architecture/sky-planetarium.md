# Sky planetarium (Explore `view=sky`)

Observer trên Trái Đất — **đứng trên landscape**: chỉ nhìn ngang + lên (alt ≥ 0), không nhìn xuống đất. FOV ~95° (65–120°).

## Pipeline thống nhất (Stellarium-style)

```
Observer (lat, lon, time)
    → equatorialToSceneVector / Alt-Az (astronomy-engine)
SkyViewState (viewAzRad, viewAltRad)  ← tâm màn hình trên lớp Alt-Az
    → viewRotationMatrix3
StereographicProvider — ortho camera + **stereographic trong shader** (không Perspective FOV > 120°)
    → Atmosphere / Milky Way / Landscape: **fullscreen plane** (0 đa giác cầu, không răng cưa viền)
    → Sao: point sprites chiếu stereographic từng đỉnh
skyScreenProject + skyPick  ← cùng projection cho nhãn / click
```

| File | Vai trò |
|------|---------|
| `skyObserver.ts` | Alt-Az scene vectors (Y = zenith) |
| `skyViewState.ts` | Hướng nhìn + ma trìn chiếu |
| `skyPipeline.ts` | Tóm tắt thứ tự layer |
| `skyLandscapePack.ts` | Gói `bahia_de_cadiz` (`angle_rotatez`, brightness) |
| `LandscapeSphericalDome.tsx` | `type = spherical` UV + alpha, world-fixed |
| `skyScreenProject.ts` | Overlay nhãn |
| `skyPick.ts` | Click chọn sao/hành tinh |

**Hướng nhìn:** `viewAltRad` từ **0 (chân trời)** đến π/2 (thiên đỉnh). Mặc định ~0.45 rad (~25° lên trời).

## Render layers (edu)

| # | Layer | File | Ghi chú |
|---|--------|------|---------|
| 1 | Atmosphere | `SkyAtmosphereStereographic.tsx` | Gradient theo `computeSunSkyState` |
| 2 | Milky Way | `MilkyWayStereographic` | `/sky/milkyway.webp` hoặc procedural |
| 3 | DSO | — | **Bỏ** (LMC/SMC sau) |
| 4 | Stars | `StereographicStarfield` + HIP cache | ~8870 sao mag ≤ 6.5 |
| 5 | Planets | `StereographicBillboard` + ephemeris | |
| 6 | Landscape | `LandscapeSphericalDome` | `bahia_de_cadiz/bahia.png` RGBA |

Không vẽ lưới Alt-Az / nhãn N-E-S-W. Nhãn chỉ khi chọn sao/hành tinh.

**Landscape:** `SKY_ACTIVE_LANDSCAPE` trong `skyLandscapePack.ts`. Đổi gói → sửa config + URL trong `skyAssets.ts`.

## Data (user-supplied)

Xem `client/public/sky/README.md`.

## Chiếu 2D (debug / overlay)

`skyProjection.ts` — `altAzToScreen` (orthographic zenith; legacy debug).
