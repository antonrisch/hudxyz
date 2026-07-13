# PRD: Directory shelves and browse

**Status:** Planned  
**Owner:** apps/web  
**Depends on:** Published apps in Turso, category catalog  
**Related:** Directory search PRD; collections admin PRD  
**Supersedes:** Directory PRD deferrals for filters and editorial shelves

## Problem

`/apps` is a flat newest-first grid. It cannot highlight a small catalog well, category links in the footer do not filter the page, and editorial picks require code changes.

## Goal

Make `/apps` a shelves-only discovery hub. Editorial collections and query-backed smart shelves share one visual treatment, while category, type, sort, and search drill-downs use a simple flat results page.

## Non-goals

- Search implementation (separate FTS5 PRD)
- Collections authoring UI (separate Padme PRD)
- Votes, ratings, rankings, or personalization
- A separate top-level games product or `/games` route
- Multi-device taxonomy beyond the existing `targetDevice` string

## Information architecture

| Route                                         | Purpose                                              |
| --------------------------------------------- | ---------------------------------------------------- |
| `/apps`                                       | Published shelves, ordered by editorial hub position |
| `/apps?type=app`                              | All published apps                                   |
| `/apps?type=game`                             | All published games                                  |
| `/apps?sort=new\|popular`                     | Flat list using the selected sort                    |
| `/apps/category/[slug]`                       | Published listings in a category                     |
| `/apps/category/[slug]?type=app\|game&sort=…` | Optional type and sort refinement                    |
| `/apps/collections/[slug]`                    | All published members/results for one collection     |
| `/apps?q=…`                                   | Full search results; implemented by the search PRD   |

Any supported filter on `/apps` switches from shelves to the flat result layout. Invalid type/sort values are ignored; an unknown category or collection slug returns 404.

`listingType` remains explicit metadata selected during submission and editable in Padme. A game is never inferred from its name or category.

## Category URLs and SEO

- Category slugs come from `src/lib/category/categories.json`.
- Resolve a category URL by slug across both listing types. For example, `/apps/category/sports` includes app and game categories named `sports`; `?type=game` narrows it.
- Match both primary and secondary category assignments.
- Repoint existing footer category links from query parameters to the flat category routes.
- Index `/apps`, non-empty type views, category pages, published collection pages, and app detail pages.
- Search results are `noindex`. Sort refinements canonicalize to their un-sorted parent. A type refinement on a category canonicalizes to the category route.
- Generate distinct title/description metadata for the hub, type views, categories, and collections.

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

Collection detail pages use the same resolver without the hub preview limit. Editorial detail keeps manual order; smart detail keeps its configured sort.

## Public UI

### Hub

- Intro heading and short copy, followed only by shelves.
- Every shelf uses the same component: title, optional description, listing row/card treatment, and a “View all” link to its collection route.
- Shelf layout is responsive and preserves useful density with a small catalog.
- If no published shelf resolves to an item, show the existing directory empty state and submit CTA.

### Flat results

- Shared result header with title, result count, active filters, sort control, and search affordance.
- Type controls: All, Apps, Games.
- Category controls only show catalog categories with at least one published matching listing.
- Sort controls: New (default) and Popular.
- Reuse the existing listing item and empty-state components.
- Filter links use server-renderable URLs; no client-only state is required for navigation.

## Query layer

Extend `src/lib/apps/queries.ts` with:

- A published-list query accepting `listingType`, `categorySlug`, `sort`, and limit/offset.
- Category counts computed from published primary and secondary assignments.
- Published collection list/detail queries and the shared shelf resolver.
- Equivalent behavior for `LISTINGS_SOURCE=sample`, or an explicit documented sample collection fixture.

Keep all published-status checks in the query layer so pages cannot accidentally expose non-public rows.

## Migration and seed

- Create the two tables and required indexes.
- Seed a minimal useful hub: smart “New” and “Popular” shelves plus at least one editorial collection when content exists.
- Seed data must be idempotent and reference app IDs/public IDs without duplicating memberships.
- Existing `/apps?type=` links continue to work.

## Acceptance

- [ ] Unfiltered `/apps` renders shelves only, in configured order.
- [ ] Editorial and smart shelves have identical presentation.
- [ ] Draft collections and unpublished apps never appear publicly.
- [ ] `/apps/category/[slug]` matches primary and secondary categories across listing types.
- [ ] Type and sort drill-downs render a flat result list.
- [ ] Popular ordering uses existing launch + simulator counts with a deterministic tie-break.
- [ ] Collection detail pages resolve both editorial and smart collections.
- [ ] Empty shelves are omitted and empty result pages have a useful state.
- [ ] Footer category links point to canonical category routes.
- [ ] Metadata and canonical URLs follow the SEO rules above.

## Deferred

- Personalized shelves
- Time-decayed popularity or analytics event history
- Collection-specific social/OG image generation
- Scheduling collection publication
- Drag-and-drop polish beyond accessible move controls
