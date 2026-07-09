<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Doc ownership (root vs `apps/web`)

| Doc | Owns |
|---|---|
| **`/AGENTS.md` (repo root)** | Product + monorepo: what MRBD is, proxy/Scramjet overview, workspace layout, commands, styling tokens, cross-app conventions |
| **`apps/web/AGENTS.md` (this file)** | App-local: Next.js 16 quirks, UI component conventions, **simulator state ownership**, web-only performance rules |

Do not duplicate long product architecture here — link or one-line point to root. Do not put Next/shadcn/slider/state rules in root.

---

## Simulator state ownership

One owner per concern. Do not dual-write the same field to URL + store + cookie.

| Concern | Owner | Examples |
|---|---|---|
| **Shareable scene** | URL (nuqs) | `url`, `mode` (store: `view`), `bg`, `additive` |
| **Session runtime** | Zustand (`lib/simulator/store.ts`) | sliders, screen/status, custom uploads, everything the UI needs this session |
| **Personal chrome** | Cookie only (`lib/simulator/prefs.ts`) | `toolbarPlacement`, `displayPanelOpen` — SSR-seeded in `app/page.tsx` |

### Rules

- **Sliders** (`backgroundBrightness`, `backgroundBlur`, `displayBrightness`): Zustand only. Live on drag. Never write the URL on tick.
- **Shareable toggles / bg / view / app url**: update Zustand for preview; mirror URL **once per commit** (toggle, select, navigate, Share) — not continuously.
- **Chrome prefs**: Zustand + cookie write on change. Not in the URL. No long-term localStorage (legacy migrate once via `migrateLegacySimulatorPreferences`).
- **Share button**: snapshot from Zustand / current app url at click time (`buildSimulatorShareUrl`). Do not rely on slider params in the query string.
- **Filters (perf)**: slider ticks schedule `applyDisplayFilters` (`lib/simulator/display-filters.ts`) — CSS vars / host iframe `filter`. Do not re-render the stage tree or run additive geometry settle for brightness/blur. Geometry settle stays for additive / bg / pan-zoom only.

### Key files

- `lib/simulator/store.ts` — session state machine
- `lib/simulator/prefs.ts` — cookie prefs
- `lib/simulator/search-params.ts` — shareable URL parsers + seed
- `lib/simulator/display-filters.ts` — imperative brightness/blur apply
- `lib/simulator/additive.ts` — additive geometry CSS vars only

---

## Buttons with icons

shadcn `Button` (`components/ui/button.tsx`) uses `data-icon` for icon + label layout. Same rules apply when composing `buttonVariants()` on other elements (e.g. links).

**Icon + text** — mark the icon, not the label:

```tsx
<Button size="lg">
  <Glasses data-icon="inline-start" />
  Open on Glasses
</Button>

<Button>
  Next
  <ArrowRight data-icon="inline-end" />
</Button>
```

- `data-icon="inline-start"` — icon before label (left in LTR)
- `data-icon="inline-end"` — icon after label (right in LTR)

The button tightens padding on the icon side via `has-data-[icon=inline-start]:pl-*` / `has-data-[icon=inline-end]:pr-*`. Do not add manual icon margins (`mr-2`, etc.).

**Icon only** — use `size="icon"` (or `icon-sm`, `icon-lg`, …). No `data-icon`.

**Icon sizing** — let the button size SVGs (`[&_svg:not([class*='size-'])]:size-4` by default). Only set `className="size-*"` on the icon when you need an exception (e.g. animation, semantic fill).
