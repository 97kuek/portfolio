# Keitaro Ueki — Portfolio

植木敬太郎の個人ポートフォリオです。日本語と英語に対応しています。

This is the bilingual personal portfolio of Keitaro Ueki.

## Development

```bash
pnpm install
pnpm dev
```

## Validation

```bash
pnpm format:check
pnpm lint
pnpm lint:styles
pnpm test:markdown
pnpm astro check
pnpm build
```

## Deployment

The static Astro build is deployed to Cloudflare Pages at
<https://97kuek.pages.dev/>.

```bash
pnpm build
wrangler pages deploy dist --project-name 97kuek --branch main
```

Comments and reactions run as Pages Functions on a D1 database. See
[DEVELOPMENT.md](DEVELOPMENT.md) for the schema, the salt secret, and the
bilingual content convention.

## Credits

Built from the Apache-2.0 licensed
[My Scholar](https://github.com/mychiffonn/myscholar) Astro template.
