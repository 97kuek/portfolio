import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"
import * as config from "../src/lib/expressive-code/config.ts"

void test("shared code CSS preserves the renderer styles and hashes their content", async () => {
  assert.equal(typeof config.getCodeStylesAsset, "function")
  const first = await config.getCodeStylesAsset()
  const second = await config.getCodeStylesAsset()
  const { baseStyles, themeStyles } = await config.ecRenderer
  const originalCss = baseStyles + themeStyles

  assert.equal(first.css, originalCss)
  assert.equal(second.css, originalCss)
  assert.equal(second.href, first.href)
  assert.equal(
    first.href,
    `/styles/code-${createHash("sha256").update(originalCss).digest("hex")}.css`,
  )
  assert.ok(first.css.length > 20_000)
  assert.match(first.css, /data-theme="light"/)
  assert.match(first.css, /data-theme="dark"/)
})

void test("code fences share one external stylesheet per document", async () => {
  const { markdownToHtml } = await import("satteri")
  const { blockExpressiveCode } = await import(
    "../src/lib/expressive-code/index.ts"
  )
  const { href, css } = await config.getCodeStylesAsset()
  const source = "```js\nconst count = 1\n```\n\n```sh\necho hello\n```"
  const hastPlugins = [blockExpressiveCode]
  for (let document = 0; document < 2; document++) {
    const { html } = await markdownToHtml(source, { hastPlugins })
    assert.equal(html.split(`href="${href}"`).length - 1, 1)
    assert.equal(html.split('class="expressive-code"').length - 1, 2)
    assert.ok(!html.includes(css))
    assert.doesNotMatch(html, /<style>\.expressive-code\{font-family:/)
  }
})

void test("external CSS keeps highlighting, scripts, copy and collapse markup unchanged", async () => {
  const { markdownToHtml } = await import("satteri")
  const { default: expressiveCode, ExpressiveCodeBlock } = await import(
    "satteri-expressive-code"
  )
  const { blockExpressiveCode } = await import(
    "../src/lib/expressive-code/index.ts"
  )
  const source =
    '```js title="example.js" collapse={2-3} mark="value"\nconst value = 1\nconsole.log(value)\nconsole.log(value)\n```'
  const original = await markdownToHtml(source, {
    hastPlugins: [
      expressiveCode({
        customCreateRenderer: () => config.ecRenderer,
        customCreateBlock: ({ input }) =>
          new ExpressiveCodeBlock({
            ...input,
            language: input.language || "plaintext",
          }),
      }),
    ],
  })
  const { html } = await markdownToHtml(source, {
    hastPlugins: [blockExpressiveCode],
  })
  const { href, css } = await config.getCodeStylesAsset()
  const expected = original.html
    .replace(`<style>${css}`, `<link rel="stylesheet" href="${href}"><style>`)
    .replace("<style></style>", "")

  assert.equal(html, expected)
  assert.match(html, /<span style="--0:/)
  assert.match(html, /class="copy"/)
  assert.match(html, /navigator.clipboard.writeText/)
  assert.match(html, /<details><summary>/)
})

void test("documents without code fences do not load the shared stylesheet", async () => {
  const { markdownToHtml } = await import("satteri")
  const { blockExpressiveCode } = await import(
    "../src/lib/expressive-code/index.ts"
  )
  const { html } = await markdownToHtml("Text with `plain inline code`.", {
    hastPlugins: [blockExpressiveCode],
  })
  assert.equal(html, "<p>Text with <code>plain inline code</code>.</p>\n")
})

void test("the static stylesheet route serves the exact CSS referenced by code blocks", async () => {
  const { getStaticPaths, GET } = await import(
    "../src/pages/styles/[asset].css.ts"
  )
  const paths = await getStaticPaths({} as Parameters<typeof getStaticPaths>[0])
  assert.equal(paths.length, 1)
  const [route] = paths
  const { href, css } = await config.getCodeStylesAsset()
  assert.equal(`/styles/${route.params.asset}.css`, href)
  const response = await GET({ props: route.props } as Parameters<
    typeof GET
  >[0])

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("Content-Type"), "text/css; charset=utf-8")
  assert.equal(await response.text(), css)
})
