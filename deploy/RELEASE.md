# Release workflow

Product releases for hudxyz.com. Feature work lands on `dev`; production deploys from `main`.

## Branch model

```
feature/* ──PR──> dev ──bot PR──> main ──Release Please PR──> tag vX.Y.Z
                     │                 │
                     │                 └── Vercel production deploy
                     └── preview / staging via Vercel
```

1. Open feature/fix PRs against **`dev` only**.
2. On every push to `dev`, `.github/workflows/promote-dev.yml` creates or updates a single
   promotion PR (`dev` → `main`).
3. Merge the promotion PR when ready to ship. That merge is the production deployment gate
   (Vercel deploys `main`).
4. `.github/workflows/release-please.yml` opens a version + developer-changelog PR on `main`.
5. Merge the Release Please PR to create the GitHub Release and `vX.Y.Z` tag.

First managed product release: **`v0.1.0`** (manifest seeded at `0.0.0`).

To force that first tag (instead of Release Please proposing `1.0.0` from full history),
`release-please-config.json` may set `"release-as": "0.1.0"`. **Remove `release-as` after
`v0.1.0` is tagged**, or every subsequent run will keep trying to release `0.1.0`.

## Conventional Commits

Release Please versions from commit types on `main` (after promotion):

| Prefix                                         | Effect (pre-1.0 with `bump-minor-pre-major`)  |
| ---------------------------------------------- | --------------------------------------------- |
| `feat:`                                        | Minor bump                                    |
| `fix:`                                         | Patch bump                                    |
| `feat!:` / `BREAKING CHANGE:`                  | Minor bump while `< 1.0.0`                    |
| `chore:`, `docs:`, `refactor:`, `test:`, `ci:` | No version bump (often hidden from changelog) |

Examples:

```text
feat(web): add hub directory search empty state
fix(simulator): restore d-pad focus after settings overlay
chore: promote dev to main
```

## Public vs developer changelog

| Surface             | Owner          | Audience                      | Status                |
| ------------------- | -------------- | ----------------------------- | --------------------- |
| Root `CHANGELOG.md` | Release Please | Maintainers / GitHub Releases | Active                |
| Public `/changelog` | Humans (MDX)   | Builders visiting hudxyz.com  | Deferred — see PRD 07 |

Do **not** render root `CHANGELOG.md` on the site. Public notes will be curated MDX in a
docs surface (portless-style), not TypeScript data files.

## Rollback

App rollback remains Instant Rollback in Vercel (see [RUNBOOK.md](./RUNBOOK.md)).
Tags and GitHub Releases are historical records — do not rewrite them. Ship a fix forward
with a new patch release when needed.

## Related files

- `.github/workflows/promote-dev.yml`
- `.github/workflows/release-please.yml`
- `release-please-config.json`
- `.release-please-manifest.json`
- [BRANCH-PROTECTION.md](./BRANCH-PROTECTION.md)
- [`docs/prd/07-mdx-docs-and-changelog.md`](../docs/prd/07-mdx-docs-and-changelog.md)
