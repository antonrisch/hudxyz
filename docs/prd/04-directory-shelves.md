# PRD: Directory shelves and browse

**Status:** Implemented  
**Owner:** apps/web  
**Depends on:** Published apps in Turso, category catalog  
**Related:** Directory search PRD; collections admin PRD  
**Supersedes:** Directory PRD deferrals for filters and editorial shelves

## Problem

`/apps` is a flat newest-first grid. It cannot highlight a small catalog well, category links in the footer do not filter the page, and editorial picks require code changes.

## Goal

Make `/apps` a shelves-only discovery hub. Editorial collections and query-backed smart shelves share one visual treatment. Categories reuse the collection detail UI. Avoid thin faceted SEO URLs while the catalog is small.

## Non-goals

- Search implementation (separate FTS5 PRD)
- Collections authoring UI (separate Padme PRD)
- Votes, ratings, rankings, or personalization
- A separate top-level games product or `/games` route
- Multi-device taxonomy beyond the existing `targetDevice` string
- Public type/sort query-param browse surfaces (`?type=`, `?sort=`)

## Information architecture

| Route                      | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `/apps`                    | Published shelves, ordered by editorial hub position |
| `/apps?q=…`                | Search results (top 20, no filters); see search PRD  |
| `/apps/categories`         | Occupied categories index (apps ∪ games by slug)     |
| `/apps/category/[slug]`    | Category detail — collection-style grid; empty → 404 |
| `/apps/collections/[slug]` | All published members/results for one collection     |

Legacy `/apps?type=` and `/apps?sort=` permanently redirect to `/apps`. An unknown category or collection slug returns 404.

`listingType` remains explicit metadata selected during submission and editable in Padme. A game is never inferred from its name or category. Type filtering stays available for Padme smart shelves only.

## Category URLs and SEO

- Category slugs come from `src/lib/category/categories.json`.
- Resolve a category URL by slug across both listing types (union). For example, `/apps/category/sports` includes app and game categories named `sports`.
- Match both primary and secondary category assignments.
- Index `/apps`, `/apps/categories`, **non-empty** category pages, published collection pages, and app detail pages.
- Sitemap emits `/apps/categories` plus only occupied category slugs (not the full catalog).
- Search results are `noindex`. Legacy type/sort params redirect away.
- Footer links to `/apps/categories` rather than hardcoded category columns.
- Generate distinct title/description metadata for the hub, categories index, category detail, and collections.

## Collection data model

Add two tables in `src/db/schema.ts`.

### `collections`

| Column                                  | Rules                                         |
| --------------------------------------- | --------------------------------------------- |
| `id`                                    | Internal UUID primary key                     |
| `slug`                                  | Required, globally unique, URL-safe           |
| `name`                                  | Required                                      |
| `description`                           | Optional short editorial copy                 |
| `kind`                                  | `editorial` or `smart`                        |
| `status`                                | `draft` or `published`                        |
| `sortOrder`                             | Hub order; lower first                        |
| `coverObjectKey`                        | Optional R2 object key                        |
| `filterListingType`                     | Smart-only optional `app` or `game`           |
| `filterCategorySlug`                    | Smart-only optional catalog slug              |
| `smartSort`                             | Smart-only required `new` or `popular`        |
| `itemLimit`                             | Smart-only hub preview limit; 3–24, default 6 |
| `createdAt`, `updatedAt`, `publishedAt` | Lifecycle timestamps                          |

Use the catalog slug rather than a category FK for smart filters so one definition can represent a cross-type slug such as `sports`. Validate that the slug exists and, when `filterListingType` is set, that it exists for that type.

Editorial collections must have null smart-filter columns. Smart collections cannot have membership rows. Enforce these invariants in shared Zod/domain validation; add database constraints where Drizzle/SQLite support them cleanly.

The collection slug is the public identity for v1. It is admin-controlled and unique, so a second public ID is unnecessary.

### `collection_apps`

| Column         | Rules                                  |
| -------------- | -------------------------------------- |
| `collectionId` | FK to `collections`, cascade on delete |
| `appId`        | FK to `apps`, cascade on delete        |
| `sortOrder`    | Manual member order                    |

Use a composite unique key on `(collectionId, appId)` and an index on `(collectionId, sortOrder)`.

## Shelf resolution

Fetch published collections in `sortOrder`, then resolve each shelf:

- **Editorial:** published member apps ordered by `collection_apps.sortOrder`.
- **Smart:** published apps matching the optional type/category filters, ordered by:
  - `new`: `publishedAt DESC`
  - `popular`: `(launchCount + simCount) DESC`, then `publishedAt DESC`
- Apply `itemLimit` to smart hub previews.
- Omit an empty shelf from the hub rather than rendering an empty row.
- Never expose a draft/rejected/archived app through collection membership.

Collection detail pages use the same resolver without the hub preview limit. Editorial detail keeps manual order; smart detail keeps its configured sort. Popular smart collections render numbered listing rows.

## Public UI

### Hub

- Intro heading and short copy, followed only by shelves.
- Every shelf uses the same component: `ChevronTitle` (linked title + chevron, optional description) and listing rows. No separate “View all” text control.
- Shelf layout is responsive and preserves useful density with a small catalog.
- If no published shelf resolves to an item, show the existing directory empty state and submit CTA.

### Categories

- `/apps/categories` lists occupied categories (count > 0) with icon, name, and count.
- `/apps/category/[slug]` reuses the collection detail shell (`DirectoryListPage`): title, description, `ListingsGrid`. No type/sort/search refinements on the page.
- Empty categories return 404 and are omitted from the sitemap.

### Collections

- Same shell as category detail; popular smart collections use the numbered grid variant.

## Query layer

Extend `src/lib/apps/queries.ts` with:

- A published-list query accepting `listingType`, `categorySlug`, `sort`, and limit/offset (type/sort remain for smart shelves and Padme).
- Category counts computed from published primary and secondary assignments (slug-union when unfiltered).
- Published collection list/detail queries and the shared shelf resolver.
- Equivalent behavior for `LISTINGS_SOURCE=sample`, or an explicit documented sample collection fixture.

Keep all published-status checks in the query layer so pages cannot accidentally expose non-public rows.

## Migration and seed

- Create the two tables and required indexes.
- Seed a minimal useful hub: smart “New” and “Popular” shelves plus at least one editorial collection when content exists.
- Seed data must be idempotent and reference app IDs/public IDs without duplicating memberships.
- Legacy `/apps?type=` / `?sort=` redirect to `/apps`.

## Acceptance

- [x] Unfiltered `/apps` renders shelves only, in configured order.
- [x] Editorial and smart shelves have identical presentation.
- [x] Draft collections and unpublished apps never appear publicly.
- [x] `/apps/category/[slug]` matches primary and secondary categories across listing types.
- [x] Type and sort public browse surfaces are removed (redirect to `/apps`).
- [x] Popular ordering uses existing launch + simulator counts with a deterministic tie-break.
- [x] Collection detail pages resolve both editorial and smart collections.
- [x] Empty shelves are omitted; empty categories 404.
- [x] Footer links to `/apps/categories`.
- [x] Metadata, canonical URLs, and sitemap follow the SEO rules above.

## Deferred

- Personalized shelves
- Time-decayed popularity or analytics event history
- Collection-specific social/OG image generation
- Scheduling collection publication
- Drag-and-drop polish beyond accessible move controls
