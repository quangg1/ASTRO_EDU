# Cosmo Learn — bản đồ palette (v2)

**Nguồn sự thật (SSOT):** `client/src/design-system/tokens/semantic.css`  
**Nạp toàn app:** `client/src/app/globals.css` (import semantic + surfaces + space-premium)

---

## Vai trò màu

| Vai trò | Token | Hex / giá trị | Dùng khi |
|--------|--------|----------------|----------|
| Nền app | `--color-bg-base` | `#0a0b10` | `body`, landing Space, Explore nền |
| Panel tối | `--color-bg-surface` | `#12141c` | sidebar, card HUD |
| Panel nổi | `--color-bg-elevated` | `#1a1d28` | modal, dropdown |
| **Card sáng** | `--color-bg-card` | `#eeedf0` | module ticket, onboarding card |
| Card sáng (hover) | `--color-bg-card-elevated` | `#f6f5f8` | hover mission card |
| Chữ trên nền tối | `--color-text-primary` | `#f2f4f8` | body, hero |
| Chữ phụ | `--color-text-muted` | `rgba(242,244,248,0.55)` | caption |
| Chữ trên card sáng | `--color-text-on-card` | `#1c1d24` | tiêu đề module |
| **Accent chính** | `--color-accent` | `#7ee7ff` | link, focus, progress, Explore |
| **Amber** | `--color-brand-amber` | `#f5a524` | gem, nhấn ấm, cosmic primary |
| **Highlight** | `--color-brand-highlight` | `#c41e3a` | hero ring, CTA marketing (tiết kiệm) |

---

## Alias (code cũ → token mới)

### Space-premium (`--sp-*`)

| Cũ | Mới |
|----|-----|
| `--sp-bg` | `--color-bg-base` |
| `--sp-card` | `--color-bg-card` |
| `--sp-card-ink` | `--color-text-on-card` |
| `--sp-accent` | `--color-brand-highlight` |
| `--sp-ink` | `--color-text-primary` |

Class `.space-premium` chỉ còn typography + layout; màu lấy từ `:root`.

### HUD Explore (`--hud-*`)

| Cũ | Mới |
|----|-----|
| `--hud-plasma` | `--color-accent` |
| `--hud-amber` | `--color-brand-amber` |
| `--hud-ink` | `--color-text-primary` |
| `--hud-bg` | `--color-bg-base` |
| `--hud-bg-2` | `--color-bg-surface` |
| `--hud-bg-3` | `--color-bg-elevated` |

### Legacy `globals.css`

| Cũ | Mới |
|----|-----|
| `--background` | `--color-bg-base` |
| `--foreground` | `--color-text-primary` |

### Cosmic landing (Tailwind `bg-cosmic`, `hsl(var(--cosmic-*))`)

Đã chỉnh HSL cho khớp nền `#0a0b10` và accent plasma. Không cần đổi class Tailwind — chỉ giá trị biến.

### Shadcn-style trong `tailwind.config.ts`

| Utility | Token |
|---------|--------|
| `ds-base` | `--color-bg-base` |
| `ds-accent` | `--color-accent` |
| `ds-card` | `--color-bg-card` |
| `ds-on-card` | `--color-text-on-card` |
| `ds-amber` | `--color-brand-amber` |
| `ds-highlight` | `--color-brand-highlight` |

---

## Module learning path

| `moduleId` | CSS var | Mặc định |
|------------|---------|----------|
| `intro-scale` | `--color-module-intro-scale` | `#a78bfa` |
| `sky-motion` | `--color-module-sky-motion` | `#38bdf8` |
| `light-observation` | `--color-module-light-observation` | `#f5a524` |
| `solar-system` | `--color-module-solar-system` | `#fb923c` |
| `stars-evolution` | `--color-module-stars-evolution` | `#f472b6` |
| `universe-cosmology` | `--color-module-universe-cosmology` | `#818cf8` |

Code: `moduleVisuals.tsx` dùng `var(--color-module-*)` cho `accent`.

---

## Surfaces (ghi đè cục bộ)

| Class | Route / vùng | Ghi chú |
|-------|----------------|---------|
| *(mặc định `:root`)* | Landing Space, layout chung | Card sáng + nền mềm |
| `.surface-edu` | `/tutorial/*` | Density Edu; accent = plasma |
| `.surface-studio` | Authoring | Nền lạnh hơn, accent teal |
| `.surface-scene` | 3D overlays | Glass; `--planet-accent` inline |

Đổi accent toàn Edu: sửa `:root --color-accent` hoặc chỉ `.surface-edu`.

---

## Quy tắc dùng trong code mới

1. **Ưu tiên** `var(--color-*)` hoặc Tailwind `ds-*` — không hardcode `#7ee7ff` / `#000`.
2. **Card nội dung** trên nền tối → `bg-ds-card` + `text-ds-on-card`.
3. **CTA / link tương tác** → `text-ds-accent` hoặc `var(--color-accent)`.
4. **Nhấn marketing** (ít) → `var(--color-brand-highlight)`.
5. **Explore / cockpit** — giữ class HUD; biến `--hud-*` đã trỏ semantic.

---

## Áp dụng toàn app (đã làm)

| Lớp | Thay đổi |
|-----|----------|
| `layout.tsx` | `body` → `bg-ds-base text-ds-text` |
| `AppShell` | `CosmoPageBackdrop` + starfield nhẹ (không nebula cyan HUD) |
| `DashboardShell` | Bỏ grid/scanline; sidebar + profile card tone Space |
| `CosmoPageBackdrop` | Glow ấm + crimson (dùng chung courses, my-courses, dashboard) |
| `.cosmo-light-panel` | Card sáng `#eeedf0` trên dashboard, `/courses` |
| `community/*` | Bỏ `hud-grid`, `hud-scan`, edge labels |
| Landing `#courses` | Bỏ `HudAtmosphere` — nền `bg-ds-base` liền hero Space |
| ~90+ file TSX | Script `migrate-palette.ps1` — hex → `ds-*` / `var(--color-*)` |

**Chưa đổi cố ý:** Explore canvas `bg-black` (WebGL), video `bg-black`, studio authoring (`.surface-studio` teal).

Chạy lại migration sau khi thêm hex mới:

```powershell
powershell -File client/scripts/migrate-palette.ps1
```

## File liên quan

- `client/src/design-system/tokens/semantic.css` — palette đầy đủ
- `client/src/design-system/tokens/cosmoColors.ts` — inline style helper
- `client/src/components/space-premium/space-premium.css` — utility class Space
- `client/src/app/globals.css` — import + cosmic + hud alias
- `client/tailwind.config.ts` — `ds-*` utilities
