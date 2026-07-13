# PRD: Collections admin

**Status:** Planned  
**Owner:** apps/web  
**Depends on:** Directory shelves and browse schema  
**Related:** Padme review queue; R2 asset helpers

## Problem

The `/apps` hub needs frequent curation, but editing JSON or deploying the site for every shelf change is not a workable platform-management tool. Padme currently reviews listings only.

## Goal

Add a lightweight Padme collections area where an editor can create, preview, order, publish, and unpublish both editorial and smart shelves without a deploy.

## Non-goals

- Multi-user roles, audit logs, or approvals
- Rich page-builder blocks
- Scheduled publishing
- Personalized or experiment-targeted shelves
- Bulk import/export
- A general-purpose CMS

## Routes and navigation

Add persistent Padme navigation for **Apps** and **Collections**.

| Route                     | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `/padme`                  | Existing app review queue                     |
| `/padme/collections`      | Collection list, hub order, and create action |
| `/padme/collections/[id]` | Collection editor and live data preview       |

Use internal collection IDs in admin URLs. The existing Padme layout access check protects pages; all new `/api/padme/*` routes use the same signed review-cookie gate and return 404 when unauthorized.

## Collection list

Show every collection ordered by `sortOrder`, with:

- name and slug
- editorial/smart kind
- draft/published status
- item count from the current public resolver
- last updated time
- move up/down controls
- edit and publish/unpublish actions

Reordering updates affected rows transactionally and normalizes order to stable integer steps. Accessible move buttons are sufficient for v1; drag-and-drop is not required.

The create action asks for kind, name, and slug, then creates a draft and navigates to its editor. Collection kind is immutable after creation; changing strategy means creating a replacement. This avoids destructive conversion between membership and smart-filter state.

## Shared editor fields

- Name: required, 1–80 characters
- Slug: required, lowercase URL-safe, unique, 1–80 characters
- Description: optional, maximum 300 characters
- Cover: optional JPEG/PNG/WebP, maximum 5 MB
- Status: draft or published
- Hub order

Slug changes show the resulting public URL before save. Because slug is the public identity in v1, the editor must explicitly confirm a slug change on a published collection.

## Editorial collection editor

- Search published apps by name/author and add them to membership.
- Show icon, name, type, category, and publication status for each member.
- Prevent duplicates.
- Reorder with move up/down controls.
- Remove membership without deleting the app.
- Preview the resolved public shelf and its full collection page order.

Membership writes use one transaction and maintain dense, deterministic `sortOrder` values.

## Smart collection editor

Expose the constrained query fields from the directory PRD:

- Optional listing type: All, Apps, Games
- Optional category slug from the catalog, narrowed by listing type when set
- Sort: New or Popular
- Hub item limit: integer from 3 to 24

Show a server-resolved preview and matching-item count before publishing. Smart filters are structured columns, not free-form SQL or JSON; the admin cannot create arbitrary queries.

## Publish rules

A collection can be published only when:

- shared metadata is valid and its slug is unique
- an editorial collection has at least one currently published member
- a smart collection has a valid sort/filter combination and resolves at least one published app
- any configured cover upload is finalized

Publishing sets `publishedAt` the first time. Unpublishing returns status to draft but preserves membership, filters, order, and the original timestamp for history. Re-publishing does not reorder the hub.

Public queries remain defensive: if members later become unpublished or a smart query becomes empty, omit the shelf even though the collection status is published. Padme displays a warning for such collections.

## API

Add:

- `GET /api/padme/collections`
- `POST /api/padme/collections`
- `GET /api/padme/collections/[id]`
- `PATCH /api/padme/collections/[id]`
- `DELETE /api/padme/collections/[id]` — draft collections only
- `PUT /api/padme/collections/[id]/members` — replace ordered editorial membership
- `POST /api/padme/collections/reorder` — replace ordered hub IDs
- `POST /api/padme/collections/[id]/cover/presign`
- `POST /api/padme/collections/[id]/cover/finalize`
- `DELETE /api/padme/collections/[id]/cover`

Use Zod schemas in a shared `src/lib/collections/admin.ts` module for request validation and invariants. Route handlers stay thin and follow existing Padme error/status conventions.

`PUT members` and reorder requests accept complete ordered ID arrays rather than a sequence of move operations. The server verifies ownership/existence, rejects duplicates, and writes the resulting order transactionally.

## Cover storage

- Reuse the existing R2 presign → client PUT → finalize pattern.
- Use collection-scoped object keys, generated server-side.
- Finalize only an expected, successfully uploaded object key.
- Replacing/removing a cover deletes the previous object after the database update; failed cleanup is logged and does not roll back valid collection data.
- No image transforms or collection-specific OG generation in v1.

## UI and save behavior

- Keep the editor a straightforward form, not a dashboard/page builder.
- Save explicit changes; do not introduce autosave for ordered membership.
- Disable controls while their mutation is in flight and surface inline errors.
- Require confirmation for delete, unpublish, and published-slug changes.
- After mutations, revalidate `/apps`, the collection route, affected category/type views, and Padme collection pages.

## Acceptance

- [ ] Unauthorized collection pages and APIs return the existing Padme 404 behavior.
- [ ] Editors can create and edit either collection kind without deploying.
- [ ] Collection kind cannot be changed after creation.
- [ ] Editorial membership is unique, ordered, and restricted to published apps.
- [ ] Smart filters are schema-validated and preview the public resolver.
- [ ] Hub order can be changed with accessible controls.
- [ ] Invalid or empty collections cannot be published.
- [ ] Publish/unpublish changes public shelves after revalidation.
- [ ] Cover upload/replace/delete uses collection-scoped R2 keys.
- [ ] Public shelf rendering still excludes unpublished apps.
- [ ] API mutations are transactional where multiple order rows change.

## Deferred

- Drag-and-drop ordering
- Adding pending apps to a collection before publication
- Publication scheduling
- Audit history and per-editor identity
- Collection duplication and templates
- Automated cover generation
