# Design System

Three-layer design system: one source of truth, multiple surfaces.

```
design-system/
├── tokens/
│   ├── primitive.ts        Layer 1 — raw scales (space/radius/duration/easing)
│   ├── semantic.css        Layer 2 — semantic CSS vars (--color-accent, …)
│   └── surfaces/           Layer 3 — per-context overrides
│       ├── edu.css         .surface-edu     — Learning Path & Course pages
│       ├── studio.css      .surface-studio  — content authoring tools
│       └── scene.css       .surface-scene   — 3D overlays
└── primitives/             Headless components consuming Layer 2 tokens
    ├── Button.tsx
    ├── Card.tsx
    ├── Input.tsx
    └── Badge.tsx
```

## Rules of the road

1. **Components never reference raw colors.** Use `bg-ds-surface`, `text-ds-accent`, etc. — never `bg-[#0a0f17]` or `text-cyan-400`.
2. **Surfaces never touch components.** A surface only redeclares CSS variables under its scoped class. Switching Edu from cyan → indigo is a one-line change in `surfaces/edu.css`.
3. **Apply surfaces at the layout level**, not inside individual components:

   ```tsx
   // app/tutorial/layout.tsx
   <div className="surface-edu">{children}</div>

   // app/studio/layout.tsx
   <div className="surface-studio">{children}</div>

   // 3D overlay
   <div className="surface-scene" style={{ ['--planet-accent']: planetColor }}>
     <EntityPanel />
   </div>
   ```

4. **Add new tokens to `semantic.css`, not surfaces.** A surface only overrides existing tokens. If you find yourself adding a new variable in a surface, lift it into `semantic.css` first with a sensible default.
5. **Cosmo v2 palette is global.** `semantic.css` is imported from `app/globals.css` for the whole app. Space (`--sp-*`), HUD (`--hud-*`), and cosmic HSL are aliases — see [`docs/design/cosmo-palette-map.md`](../../docs/design/cosmo-palette-map.md).

## Available tokens (cheat sheet)

| Concern        | CSS variable                                                | Tailwind utility (`bg-`, `text-`, `border-`, …) |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Page bg        | `--color-bg-base`                                           | `ds-base`                                       |
| Surface bg     | `--color-bg-surface`                                        | `ds-surface`                                    |
| Elevated bg    | `--color-bg-elevated`                                       | `ds-elevated`                                   |
| Glass overlay  | `--color-bg-overlay`                                        | `ds-overlay`                                    |
| Light card     | `--color-bg-card` / `-elevated`                             | `ds-card` / `ds-card-elevated`                  |
| Text on card   | `--color-text-on-card` / `-muted-on-card`                   | `ds-on-card` / `ds-on-card-muted`               |
| Brand amber    | `--color-brand-amber`                                       | `ds-amber`                                      |
| Marketing ring | `--color-brand-highlight`                                   | `ds-highlight`                                  |
| Border         | `--color-border` / `--color-border-strong`                  | `ds-border` / `ds-border-strong`                |
| Text           | `--color-text-primary` / `--color-text-muted` / `--subtle`  | `ds-text` / `ds-muted` / `ds-subtle`            |
| Accent         | `--color-accent` / `-soft` / `-strong` / `-fg`              | `ds-accent` / `-soft` / `-strong` / `-fg`       |
| Roles          | `--color-{success,warning,danger,info}`                     | `ds-{success,warning,danger,info}` (+ `-soft` / `-strong`) |
| Radius         | `--radius-{card,control,chip}`                              | `rounded-ds-{card,control,chip}`                |
| Density        | `--density-{pad-x,pad-y,content,gap}`                       | use as arbitrary (`px-[var(--density-pad-x)]`)  |
| Motion         | `--motion-{fast,base}` / `--motion-easing`                  | `duration-ds-{fast,base}` / `ease-ds`           |

## Adding a new surface

1. Drop `surfaces/<name>.css` defining `.surface-<name>` with only the variables that diverge from `:root`.
2. Import it from `app/globals.css` next to the others.
3. Wrap the relevant layout: `<div className="surface-<name>">…</div>`.

That's it. No primitive changes needed.
