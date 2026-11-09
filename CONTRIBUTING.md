# Contributing

This repository is Keitaro Ueki's personal portfolio. Keep changes focused on
its content, accessibility, and maintainable static-site implementation.

## Before you start

1. Read `AGENTS.md` and `DEVELOPMENT.md`.
2. Read `docs/CUSTOMIZATION.md` if your change affects site configuration.
3. Open an issue first for large visual redesigns, schema changes, routing
   changes, or dependency additions.

## Local setup

```bash
corepack enable
pnpm install
pnpm dev
```

## Pull request checklist

- Keep changes focused.
- Add or update docs when behavior, configuration, or user workflow changes.
- Avoid new dependencies unless the feature clearly needs them.
- Preserve static output and low client-side JavaScript.
- Run the [validation commands](README.md#validation), followed by
  `pnpm test:browser`.

- Include screenshots for visual changes.

## Commit style

Use clear, descriptive commit messages:

```text
Add Japanese tag navigation
Fix footnote keyboard controls
```

Do not add AI attribution or co-author lines.

## Reporting bugs

Include:

- What page or command failed.
- Expected behavior.
- Actual behavior.
- Node and pnpm versions.
- Relevant console output or build errors.
- Screenshots for visual bugs.

## Proposing features

Explain:

- The user problem.
- The pages/components affected.
- Whether it adds dependencies or client JavaScript.
- How it fits the portfolio's use case.

Features that improve content portability, performance, accessibility, or
customization are more likely to fit the project than broad UI framework
rewrites.
