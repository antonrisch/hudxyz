<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Doc ownership (root vs `apps/web`)

| Doc                                  | Owns                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`/AGENTS.md` (repo root)**         | Product + monorepo: MRBD, proxy/Scramjet, **directory/submit architecture**, workspace layout, commands, styling tokens                                           |
| **`apps/web/AGENTS.md` (this file)** | App-local: Next.js 16 quirks, **button / link / Copy icon conventions**, **simulator state ownership**, **listing URL / submit form rules**, web-only performance |

Do not duplicate long product architecture here — link or one-line point to root. Do not put Next/shadcn/slider/state rules in root.

---

## Listing URLs

Canonical detail path is `/apps/{slug}/{publicId}` via `listingPath` in `src/lib/apps/public-id.ts`.

| Concern             | Owner                    | Rules                                                                                                                    |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Stable identity** | `publicId`               | Resolve published detail with `getPublishedListingByPublicId`. Never key public routes on slug alone.                    |
| **SEO crumb**       | `slug`                   | Derived from `name` (`slugifyName`); not unique. If the path slug ≠ row slug, `permanentRedirect` to the canonical path. |
| **Browse routes**   | static segments          | `/apps/category/*`, `/apps/categories`, and `/apps/collections/*` are reserved — not legacy slug redirects.              |
| **Legacy links**    | `/apps/[slug]`           | Redirect only when exactly one published row matches; otherwise 404.                                                     |
| **Draft deep-link** | `?id=` on `/apps/submit` | Public id (Crockford), not internal uuid. Asset/draft APIs accept either and resolve to internal `apps.id` for R2 keys.  |

Directory UI: `src/components/listings/`. Listing queries: `src/lib/apps/queries.ts`. Search: `src/lib/apps/search.ts` + FTS `app_search` (`search-index.ts`; `pnpm db --rebuild-search`). Shelves: `src/lib/collections/queries.ts` (public) + `admin.ts` (Padme CRUD; cover uploads deferred). Browse URL helpers: `src/lib/apps/browse-params.ts`. Header palette: `src/components/layout/search-command.tsx`. Padme collections: `/padme/collections` + `/api/padme/collections/*`.

---

## Submit form

`/apps/submit` — one page, progressive: details → media → submit. Product overview in root `AGENTS.md`; form mechanics here.

| Concern        | Rule                                                                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stub draft** | Create lazily on first save or upload (`POST /api/apps` `{ stub: true }`). Do **not** create on mount (avoids bounce DB rows). Deduplicate in-flight create with a promise ref.                                      |
| **Autosave**   | Blur/save when Zod `submitFormValuesSchema` passes → `PATCH /api/apps/[id]`. Quiet (no success toast); submit surfaces errors.                                                                                       |
| **Media**      | Shared `Attachment` UI (`src/components/ui/attachment.tsx`) for icon / screenshots / video. Upload path: validate → presign → R2 PUT → register (`src/lib/apps/upload-client.ts`). Register only after PUT succeeds. |
| **Submit**     | Requires valid details + ready icon; then persist draft + `POST …/submit` → confirmation.                                                                                                                            |
| **Form lib**   | TanStack Form + Zod (`draft-schema.ts`). Type the form as `SubmitFormApi` — do not pass `form: any`.                                                                                                                 |

Key files: `src/components/submit/*`, `src/lib/apps/draft.ts`, `draft-schema.ts`, `upload-client.ts`, `api-error.ts`.

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

Use the shared rotated Copy from `@/components/icons/copy` — **not** `lucide-react`'s `Copy` — so clipboard affordances match across listing, submit, and simulator:

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

<Link href="/apps/submit" className={buttonVariants({ variant: "brand", size: "lg" })}>
  Submit
</Link>

<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  className={buttonVariants({ variant: "outline" })}
>
  <Glasses data-icon="inline-start" />
  Preview in simulator
</a>
```

For custom hit targets that only need a button-looking chip (e.g. copy-link row), put `buttonVariants(...)` on an inner `<span>` with `pointer-events-none` and keep the real interaction on the outer control.
