import assert from "node:assert/strict"
import test from "node:test"
import { markdownToHtml } from "satteri"

import { calloutDirective } from "../src/lib/callout.ts"
import { collapseCjkLineBreaks } from "../src/plugins/satteri-cjk-line-breaks.ts"
import { imageFigures } from "../src/plugins/satteri-image-figures.ts"
import { externalLinks } from "../src/lib/external-links.ts"
import { headingAnchors } from "../src/lib/heading-anchors.ts"
import { headingNamespace } from "../src/lib/heading-namespace.ts"
import { temmlMath } from "../src/lib/math.ts"
import { normalizeHeadings } from "../src/plugins/satteri-normalize-headings.ts"
import { satteriSidenotes } from "../src/plugins/satteri-sidenotes.ts"

void test("sidenote state resets between documents", async () => {
  const hastPlugins = satteriSidenotes()
  const first = await markdownToHtml("First.[^note]\n\n[^note]: First note.", {
    hastPlugins,
  })
  const second = await markdownToHtml(
    "Second.[^note]\n\n[^note]: Second note.",
    { hastPlugins },
  )

  assert.match(first.html, /id="sn-1"/)
  assert.match(second.html, /id="sn-1"/)
  assert.doesNotMatch(second.html, /id="sn-2"/)
  assert.match(second.html, /Second note/)
  assert.doesNotMatch(second.html, /First note/)
})

void test("repeated references receive unique controls and backrefs", async () => {
  const { html } = await markdownToHtml(
    "First.[^note] Second.[^note]\n\n[^note]: Shared note.",
    { hastPlugins: satteriSidenotes() },
  )
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])

  assert.match(html, /id="sn-1"/)
  assert.match(html, /id="sn-1-2"/)
  assert.match(html, /href="#snref-1"/)
  assert.match(html, /href="#snref-1-2"/)
  assert.equal(new Set(ids).size, ids.length)
})

void test("footnote label stays accessible without entering the heading outline", async () => {
  const { html } = await markdownToHtml("Text.[^note]\n\n[^note]: Note.", {
    hastPlugins: [...satteriSidenotes(), headingAnchors],
  })

  assert.match(
    html,
    /<div class="sr-only" id="footnote-label">Footnotes<\/div>/,
  )
  assert.doesNotMatch(html, /<h2[^>]*id="footnote-label"/)
  assert.doesNotMatch(html, /href="#footnote-label"/)
})

void test("the configured Satteri feature pipeline composes correctly", async () => {
  const markdown = [
    "# Heading",
    "",
    "An [external link](https://example.com), a [[/projects|wikilink]], and a note.[^note]",
    "",
    ":::note[Callout]",
    "Callout body.",
    ":::",
    "",
    "$$",
    "x^2",
    "$$",
    "",
    "[^note]: Footnote body.",
  ].join("\n")
  const { html } = await markdownToHtml(markdown, {
    features: { directive: true, math: true, wikilinks: true },
    mdastPlugins: [normalizeHeadings, calloutDirective, temmlMath],
    hastPlugins: [externalLinks, ...satteriSidenotes(), headingAnchors],
  })

  assert.match(html, /<h2 id="heading">/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /href="\/projects"/)
  assert.match(html, /<details data-callout="note" open>/)
  assert.match(html, /<math-display>/)
  assert.match(html, /class="sidenote"/)
})

void test("subpost heading namespaces reset for every document", () => {
  const hastPlugins = [headingNamespace, headingAnchors]
  const first = markdownToHtml("## Repeated\n\n## Repeated", {
    hastPlugins,
    fileURL: new URL("file:///content/blog/series/first.md"),
  })
  const second = markdownToHtml("## Repeated", {
    hastPlugins,
    fileURL: new URL("file:///content/blog/series/second.md"),
  })

  assert.match(first.html, /id="first-repeated"/)
  assert.match(first.html, /id="first-repeated-1"/)
  assert.match(second.html, /id="second-repeated"/)
  assert.doesNotMatch(second.html, /id="second-repeated-1"/)
})

void test("a wrapped Japanese paragraph loses the space its line break implies", () => {
  const { html } = markdownToHtml(
    "早稲田大学で情報通信を学びながら、\n機械学習の応用に取り組んでいます。",
    { mdastPlugins: [collapseCjkLineBreaks] },
  )

  assert.match(html, /学びながら、機械学習/)
  assert.doesNotMatch(html, /、\s+機械/)
})

void test("a line break beside Latin text keeps its space", () => {
  const { html } = markdownToHtml(
    "Machine learning and\nsoftware development.\n\nPyTorch\nと機械学習。",
    { mdastPlugins: [collapseCjkLineBreaks] },
  )

  assert.match(html, /and\s+software/)
  assert.match(html, /PyTorch\s+と機械学習/)
})

void test("a line break across an inline element is collapsed too", () => {
  const { html } = markdownToHtml(
    "**AIエンジニア**\nとして働いています。\n\n設計と\n**実装**を担当。",
    { mdastPlugins: [collapseCjkLineBreaks] },
  )

  assert.match(html, /<\/strong>として/)
  assert.match(html, /設計と<strong>/)
})

void test("a standalone image becomes a figure with its alt text as caption", () => {
  const { html } = markdownToHtml("![滑走路の機体](/photo.jpg)", {
    hastPlugins: [imageFigures],
  })

  assert.match(html, /<figure><img src="\/photo.jpg" alt=""/)
  assert.match(html, /<figcaption>滑走路の機体<\/figcaption>/)
})

void test("images without alt text, and images inside a sentence, are left alone", () => {
  const { html } = markdownToHtml(
    "![](/bare.jpg)\n\nSee ![a chart](/chart.jpg) here.",
    { hastPlugins: [imageFigures] },
  )

  assert.doesNotMatch(html, /<figure>/)
  assert.match(html, /See <img src="\/chart.jpg" alt="a chart"> here/)
})
