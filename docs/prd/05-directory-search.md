# PRD: Directory search

**Status:** Implemented  
**Owner:** apps/web  
**Depends on:** Directory shelves and browse PRD  
**Related:** Published app lifecycle; category catalog

## Problem

As the directory grows, browsing shelves and categories will not be enough to find a known app or capability. The header has no search entry point, and SQLite keyword search is not indexed.

## Goal

Add fast, typo-tolerant-enough keyword discovery using Turso/SQLite FTS5: a command-palette-style header search with the first few results and a full result view at `/apps?q=…`.

## Why FTS5

- The catalog is small and its searchable fields are structured text.
- FTS5 runs in the existing Turso database and requires no external service.
- Prefix matching and weighted BM25 ranking cover app-name and capability lookup.
- Vector embeddings, hybrid ranking, and a separate search vendor add operational cost without a current relevance need.

## Non-goals

- Vector or semantic search
- Fuzzy edit-distance correction and “did you mean”
- Search analytics, personalization, or sponsored results
- Searching drafts, reviewer notes, contact email, or launch URLs
- General site-wide search outside the app directory

## Search document

Create an FTS5 virtual table in a database migration:

```sql
CREATE VIRTUAL TABLE app_search USING fts5(
  app_id UNINDEXED,
  name,
  author,
  description,
  categories,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);
```

One document represents one published app:

| Field         | Source                                                |
| ------------- | ----------------------------------------------------- |
| `app_id`      | Internal `apps.id`; returned for joining, not indexed |
| `name`        | `apps.name`                                           |
| `author`      | `apps.author`                                         |
| `description` | `apps.description` or empty string                    |
| `categories`  | Primary and secondary category names, space-separated |

Do not index private or operational fields. The public result is hydrated from the canonical published-listing query, not returned directly from FTS storage.

## Index synchronization

Add a shared server-only helper that rebuilds one app's search document:

1. Delete any existing `app_search` row for `app_id`.
2. Read the current app plus primary/secondary category names.
3. Insert a document only when `status = published`.

Call it in the same database transaction as every mutation that can affect the document:

- publish, unpublish, reject, or archive
- name, author, description, listing type, or category edit
- app deletion, if deletion is added later

Do not use database triggers: the document joins category rows and application-level lifecycle writes already have a shared admin path. Explicit transactional synchronization is easier to understand and test.

Add an idempotent rebuild script that clears and backfills the index from all published apps. Run it after the migration and whenever category display names are changed in the catalog/seed. The script is also the recovery path if index drift is suspected.

## Query and ranking

- Normalize Unicode whitespace and trim input.
- Require at least 2 visible characters and cap at 100.
- Tokenize user input into words, escape FTS operators/quotes, and build a safe AND-prefix query. Raw user text must never be interpolated as FTS syntax.
- Rank with weighted `bm25`: name highest, then categories, author, description.
- Use total opens (`launchCount + simCount`) and then `publishedAt` only as deterministic tie-breakers after relevance.
- Only hydrate rows whose current app status is still `published`.

Suggested weights: name `10`, categories `5`, author `3`, description `1`. Keep them as named constants so relevance can be tuned without a migration.

## Public search API

`GET /api/apps/search?q=<query>&limit=<n>`

- Public, read-only endpoint.
- Default `limit = 5`; clamp to `1..20`.
- Empty/short queries return `{ results: [] }` without querying FTS.
- Invalid query parameters return 400; internal/FTS failures return the shared safe API error shape.
- Return the minimum listing result shape needed by the header palette: `publicId`, `name`, `listingType`, primary category name, icon URL, and canonical detail path (`href`).
- Set short public cache headers suitable for directory data; do not cache error responses.

The full results page may call the search query directly as a Server Component rather than round-tripping through the HTTP endpoint. The endpoint primarily serves interactive header search.

## Header command palette

Add a search affordance to `src/components/layout/app-header.tsx`.

- Opens a command-palette-style dialog via `cmdk` (`Command` / `CommandDialog` in `src/components/ui/command.tsx`) for keyboard navigation and filtering control (`shouldFilter={false}` — we filter server-side).
- Search input is focused when opened and has an accessible label.
- Debounce requests briefly (about 150 ms) and cancel superseded requests.
- Show up to five rows with icon, app name, listing type, and category.
- Arrow keys move through results; Enter opens the selected app; Escape closes.
- A final “View all results for …” row navigates to `/apps?q=<encoded query>`.
- Include clear loading, no-results, and error states without toast spam.
- The trigger remains usable in both desktop and narrow header layouts.

## Full results at `/apps?q=`

- Reuse the flat list shell from the directory shelves PRD.
- Default sort is relevance. Permit type and category refinement without dropping `q`.
- If explicit sort choices are shown for search, use Relevance, New, and Popular; changing away from relevance preserves the search match set.
- Search result pages are `noindex, follow` and canonicalize to `/apps`.
- Preserve the query in the search field and include the result count.
- Empty results suggest browsing categories and submitting an app.

## Performance and resilience

- FTS returns IDs first; hydrate a bounded page of public listing data in one query.
- Avoid one query per result for icons/categories.
- Command results must be race-safe so a slower old request cannot replace newer results.
- If FTS is unavailable, return a controlled error; do not silently fall back to an unbounded `LIKE` scan.

## Acceptance

- [x] Only currently published apps are searchable.
- [x] Name, author, description, and both category names contribute to matches.
- [x] Name matches rank above equivalent description matches.
- [x] Multi-word and prefix searches work without exposing raw FTS syntax.
- [x] Publishing/updating/unpublishing an app updates the index transactionally.
- [x] The rebuild script produces one document per published app.
- [x] Header search shows at most five keyboard-navigable results.
- [x] “View all” opens `/apps?q=` and preserves the query.
- [x] Full results support type/category refinement and remain `noindex`.
- [x] Search does not expose private listing fields.

## Deferred

- Typo correction and synonyms
- Search event analytics
- Time-decayed popularity signals
- Vector or hybrid retrieval
- Site-wide results outside apps
