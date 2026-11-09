# Search, reactions and CI implementation plan

**Goal:** Fix search history, serialize reaction toggles in D1, and deploy the same output validated by CI.

**Architecture:** Preserve Astro history state. Add a backward-compatible reaction `active` column and toggle it with one UPSERT. CI validates once and hands its static artifact to the reusable Pages deployment workflow; schema migrations remain a manual prerequisite.

**Tech stack:** Astro, TypeScript, Cloudflare Pages/D1, GitHub Actions.

**Spec:** The user's approved items 1–3 from the preceding audit.

## Constraints

- Preserve existing work. The follow-up request authorizes committing, pushing and activating CI through a pull request.
- Keep static output, Node.js >=22.12.0 and pinned pnpm.
- Preserve POST reaction payloads and existing reactions.
- Never write test data to production.
- Deploy production only after checks and the additive D1 migration succeed.

## Tasks

- [x] Search: add Japanese/English back-and-forward browser regressions, observe failure, preserve `history.state` in `SearchPage.astro`, verify after build.
- [x] Reactions: add real local D1 concurrency tests, observe failure, add `0002_reaction_active.sql`, use atomic UPSERT and filter active rows, verify even/odd toggles and existing data.
- [x] CI: keep validation/build/browser checks in `ci.yml`; upload checked output, call `deploy.yml` only on main outside PRs; download the same artifact and deploy without rebuilding or database access.
- [x] Update deployment documentation and unit test registration.
- [x] Format, lint/styles, unit/Markdown/type/build/HTML/link checks, actionlint and browser regressions.
- [x] Independent review, apply migration and deploy manually, verify live search navigation without production API writes.

## Review focus

- Search query/results survive back and forward in both languages.
- Reaction defaults preserve existing selected rows; simultaneous operations preserve parity.
- PRs and manual runs on non-main branches cannot deploy or migrate production.
- Missing secrets skip deployment; validation failures prevent artifact deployment.
- Hidden output files and Functions source survive the deploy path.

## Verification

- All local checks passed: 48 unit tests, 18 Markdown tests, type/build/41 HTML/link checks, actionlint, and 270 browser tests (6 intentional skips).
- A fresh reviewer found no blocking issues.
- Production migrations applied; reaction/comment row counts were preserved.
- Deployed to https://d89a4527.97kuek.pages.dev (production alias https://97kuek.pages.dev).
- Live search history checks passed in all four viewport projects (16 cases); reactions GET returned 200.
- Workflow files are implemented and validated locally; the follow-up integrates them through a pull request and verifies GitHub CI.
