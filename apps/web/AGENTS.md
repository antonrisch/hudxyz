<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Doc ownership (root vs `apps/web`)

| Doc                                  | Owns                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`/AGENTS.md` (repo root)**         | Product + monorepo: MRBD, proxy/Scramjet, **hub directory / submit architecture**, workspace layout, commands, styling tokens                           |
| **`apps/web/AGENTS.md` (this file)** | App-local: Next.js 16 quirks, **button / link / Copy icon conventions**, **simulator state ownership**, **hub submit form rules**, web-only performance |

Do not duplicate long product architecture here — link or one-line point to root. Do not put Next/shadcn/slider/state rules in root.

---

## Hub directory

Public browse is a single flat page at `/hubs` (shadcn Registry Directory style). Client search + pagination via nuqs (`?q=` / `?page=`). No detail/category/collection routes — legacy paths redirect to `/hubs`.

| Concern             | Owner                        | Rules                                                                                  |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| **Stable identity** | `publicId`                   | 10-char Crockford (`lib/hubs/public-id.ts`). Draft deep-link `?id=` on `/hubs/submit`. |
| **Slug**            | derived from `name`          | Not unique; not used in public browse URLs.                                            |
| **Try**             | `launchUrl` (required)       | Row action → `/simulator?url=…`.                                                       |
| **Logo**            | R2 `logoObjectKey` on `hubs` | Presign → PUT → register (`lib/hubs/upload-client.ts`).                                |

Directory UI: `src/components/directory/`. Queries: `src/lib/hubs/queries.ts`. Header palette: `src/components/layout/search-command.tsx` (client filter over `GET /api/hubs/list`).

**Future:** when app listings return, `apps.hubId` MUST be `NOT NULL` → `hubs(id)`.

---

## Hub submit form

`/hubs/submit` — name, homepage, launch URL, contact email, description (optional), logo. Product overview in root `AGENTS.md`.

| Concern        | Rule                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stub draft** | Create lazily on first save or upload (`POST /api/hubs` `{ stub: true }`). Do **not** create on mount. Deduplicate in-flight create with a promise ref. |
| **Autosave**   | Blur when Zod `submitHubFormValuesSchema` passes → `PATCH /api/hubs/[id]`. Quiet (no success toast).                                                    |
| **Logo**       | validate → presign → R2 PUT → register (`lib/hubs/upload-client.ts`).                                                                                   |
| **Submit**     | Valid details + ready logo → `POST …/submit` → confirmation.                                                                                            |
| **Form lib**   | TanStack Form + Zod (`lib/hubs/draft-schema.ts`).                                                                                                       |

Key files: `src/components/submit/hub-submit-form.tsx`, `src/lib/hubs/draft.ts`, `upload-client.ts`, `api-error.ts`.

---

## Simulator state ownership

One owner per concern. Do not dual-write the same field to URL + store + cookie.

| Concern             | Owner                                      | Examples                                                                            |
| ------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Shareable scene** | URL (nuqs)                                 | `url`, `mode` (store: `view`), `bg`, `additive`                                     |
| **Session runtime** | Zustand (`src/lib/simulator/store.ts`)     | sliders, screen/status, custom uploads, everything the UI needs this session        |
| **Personal chrome** | Cookie only (`src/lib/simulator/prefs.ts`) | `toolbarPlacement`, `displayPanelOpen` — SSR-seeded in `src/app/simulator/page.tsx` |

### Rules

- **Sliders** (`backgroundBrightness`, `backgroundBlur`, `displayBrightness`): Zustand only. Live on drag. Never write the URL on tick.
- **Shareable toggles / bg / view / app url**: update Zustand for preview; mirror URL **once per commit** (toggle, select, navigate, Share) — not continuously.
- **Chrome prefs**: Zustand + cookie write on change. Not in the URL. No long-term localStorage (legacy migrate once via `migrateLegacySimulatorPreferences`).
- **Share button**: snapshot from Zustand / current app url at click time (`buildSimulatorShareUrl`). Do not rely on slider params in the query string.
- **Filters (perf)**: slider ticks schedule `applyDisplayFilters` (`src/lib/simulator/display-filters.ts`) — CSS vars / host iframe `filter`. Do not re-render the stage tree or run additive geometry settle for brightness/blur. Geometry settle stays for additive / bg / pan-zoom only.

### Key files

- `src/lib/simulator/store.ts` — session state machine
- `src/lib/simulator/prefs.ts` — cookie prefs
- `src/lib/simulator/search-params.ts` — shareable URL parsers + seed
- `src/lib/simulator/display-filters.ts` — imperative brightness/blur apply
- `src/lib/simulator/additive.ts` — additive geometry CSS vars only

---

## Buttons with icons

shadcn `Button` (`src/components/ui/button.tsx`) uses `data-icon` for icon + label layout. Same rules apply when composing `buttonVariants()` on other elements (links, decorative spans inside custom hit targets).

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

### Copy icon

Use the shared rotated Copy from `@/components/icons/copy` — **not** `lucide-react`'s `Copy` — so clipboard affordances match across submit and simulator:

```tsx
import { Copy } from "@/components/icons/copy";

<Copy data-icon="inline-start" />;
```

Pair with Lucide `Check` for the copied state. Same `data-icon` rules as other icons.

### Links (and other non-`Button` hosts)

Style navigation / external links like buttons with `buttonVariants()` + `className` / `cn` — do not wrap a `<Button>` inside an `<a>` / `<Link>`:

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

<Link href="/hubs/submit" className={buttonVariants({ variant: "brand", size: "lg" })}>
  Submit
</Link>;
```

For custom hit targets that only need a button-looking chip (e.g. copy-link row), put `buttonVariants(...)` on an inner `<span>` with `pointer-events-none` and keep the real interaction on the outer control.
