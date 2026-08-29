# Development

My Scholar is based on Astro Erudite v2 and keeps the same core direction:
ship a fast, owned, Markdown-first static site with minimal client JavaScript and
plain CSS that is easy to inspect.

## Principles

- Prefer native Astro, HTML, and CSS before adding framework islands.
- Keep dependencies light. A small local component is often better than a UI
  dependency for one widget.
- Own theme primitives: colors, spacing, typography, shape, motion, and icons are
  local tokens or local files.
- Keep content schema-first. Validate author, project, blog, publication, and
  profile data with Zod instead of allowing loosely shaped content.
- Keep Markdown portable. Prefer `.md`, Sätteri plugins, directives, callouts,
  math, and code transforms over MDX-only content. Sätteri Markdown pipeline for callouts, links, headings, math, and code
- Keep pages dense but readable. This is an academic/research site, not a
  marketing landing page.
- Preserve static output. Avoid client-side state unless the interaction clearly
  needs it.

## Project map

- `astro.config.ts`: Astro, sitemap, image, server, and Markdown processor
  configuration.
- `src/site.config.ts`: user-facing site, profile, navigation, publication, and
  footer config.
- `src/content.config.ts`: content collection loaders and schemas.
- `src/schemas.ts`: reusable config and content schema definitions.
- `src/icon.config.ts`: semantic icons, profile icons, project link icons, and
  publication link icons.
- `src/pages/`: routes.
- `src/layouts/`: shared page shells.
- `src/components/`: UI components grouped by domain.
- `src/lib/`: content processing and feature logic.
- `src/styles/`: global CSS tokens and shared styling.
- `src/content/`: user-editable content.
- `public/`: static assets served from `/`.
- `functions/`: Cloudflare Pages Functions backing comments and reactions.
- `migrations/`: SQL applied to the D1 database behind those endpoints.

## Bilingual content

English is the default language and owns the unprefixed routes; Japanese lives
under `/ja`. Collections keep one file per language:

- The English entry is the plain filename (`hello.md`) and needs no extra
  frontmatter.
- Its Japanese pair is `hello-ja.md` with `lang: "ja"` and
  `routeSlug: "hello"`. The two share a URL slug and, with it, one comment
  thread and one set of reaction counts.

The suffix cannot be `.en`/`.ja` before the extension: the glob loader strips
punctuation when it derives entry ids, and a frontmatter key named `slug` is
read as an id override, which silently collapses translations into one entry.

## Comments and reactions

Both are served by Pages Functions in `functions/api/`, backed by a D1 database
(`portfolio-interactions`, bound as `DB` in `wrangler.jsonc`). Visitors are
anonymous; a salted hash of address and user agent limits one reaction per kind
per visitor and caps comments at five per hour. That salt is a Pages secret:

```bash
wrangler pages secret put INTERACTION_SALT --project-name 97kuek
```

Schema changes go in `migrations/` and are applied with:

```bash
wrangler d1 execute portfolio-interactions --remote --file=migrations/<file>.sql
```

To hide a comment without deleting it, set `visible = 0` on its row. The
endpoints only run on Pages, so during `pnpm dev` the widgets render and report
that they could not load.

## Commands

```bash
pnpm install
pnpm dev
pnpm sync
pnpm format
pnpm format:check
pnpm lint
pnpm lint:styles
pnpm test:markdown
pnpm astro check
pnpm build
pnpm preview
pnpm clean
```

Use `pnpm routine` for the standard pre-PR local pass.

## Development loop

1. Read the nearest config and schema before editing behavior.
2. Make the smallest content/schema/component change that satisfies the task.
3. Run the narrowest useful check first.
4. Run `pnpm routine` and `pnpm build` before a pull request.
5. For visual changes, start `pnpm dev` and capture desktop and mobile
   screenshots of affected pages.

## Content rules

- Blog files are Markdown collected from `src/content/blog`.
- Blog subposts use a folder with `index.md` plus ordered child posts.
- Project files are Markdown collected from `src/content/projects`, excluding
  `README.md`.
- People are defined in `src/content/people.toml`.
- Experience is defined in `src/content/experience.json`.
- Publications are loaded from BibTeX at `src/content/publications/main.bib`.

Do not introduce MDX unless the feature genuinely needs component islands inside
content. If MDX is needed, document the reason and update install/customization
docs.

## CSS rules

- Use existing tokens from `src/styles/color.css`, `layout.css`,
  `typography.css`, and `shape.css`.
- Prefer component-scoped CSS in `.astro` files for one component's layout.
- Put shared reusable styling in `src/styles/`.
- Avoid Tailwind and utility-class systems unless the project direction changes.
- Check light and dark modes for all color changes.

## Icon rules

- Prefer semantic icon names from `src/icon.config.ts` in app components.
- Use local SVGs in `src/assets/icons/` for brand/tool icons that are part of the
  theme.
- Add Iconify sets only when they replace many local one-off assets or unlock a
  coherent icon family.
