# Branch protection and release bots

Intended GitHub settings for the `dev` → `main` promotion flow and Release Please.
Private repositories need GitHub Pro (or public visibility) for rulesets / classic branch
protection via the API — configure these in the GitHub UI when available.

## Required branch rules (`dev` and `main`)

Apply to both branches:

| Setting                                   | Value                                                   |
| ----------------------------------------- | ------------------------------------------------------- |
| Require a pull request before merging     | On (when available on your GitHub plan)                 |
| Require status checks to pass             | Skip on free private repos — use husky + Vercel instead |
| Require conversation resolution           | On (recommended)                                        |
| Do not allow bypassing the above settings | On for everyone except emergency break-glass accounts   |
| Restrict who can push                     | No direct pushes; PR-only                               |

## `main`-specific policy

- Prefer a single open promotion PR (`chore: promote dev to main`) created by `.github/workflows/promote-dev.yml`.
- After that PR merges, Release Please opens a version / developer-changelog PR on `main`.
- Merging the Release Please PR creates the GitHub Release + tag (`vX.Y.Z`).
- Do not open feature PRs directly into `main`.
- Quality gates run locally (husky pre-commit / pre-push) and via Vercel preview builds — there is no GitHub Actions CI workflow on the free private plan.

## Bot permissions

Workflows use `secrets.GITHUB_TOKEN` by default:

| Workflow             | Permissions needed                        |
| -------------------- | ----------------------------------------- |
| `promote-dev.yml`    | `pull-requests: write`, `contents: read`  |
| `release-please.yml` | `contents: write`, `pull-requests: write` |

If a bot-authored PR does not trigger required CI checks (GitHub’s default for `GITHUB_TOKEN`
PRs), create a fine-grained PAT or GitHub App with `contents` + `pull-requests` write, store it
as `RELEASE_PLEASE_TOKEN` / `PROMOTE_TOKEN`, and point the workflows at that secret.

Also enable **Settings → Actions → General → Workflow permissions**:

- Read and write permissions
- Allow GitHub Actions to create and approve pull requests

Without that checkbox, `promote-dev.yml` fails with
`GitHub Actions is not permitted to create or approve pull requests`.

## Verification checklist

1. Merge a conventional-commit feature PR into `dev`.
2. Confirm Promote workflow opens or updates one `dev` → `main` PR.
3. Merge the promotion PR → Vercel deploys production from `main`.
4. Confirm Release Please opens a release PR proposing the next version (first run: `v0.1.0`).
5. Merge the Release Please PR → GitHub Release + tag exist.
6. When public MDX docs ship (PRD 07), add a curated product note for user-visible releases.
