import assert from "node:assert/strict"
import test from "node:test"

import { createBlogDataLoader } from "../src/lib/blog/data.ts"
import type { AuthorData, Post } from "../src/lib/blog/types"
import { calculateWordCountFromHtml } from "../src/lib/blog/word-count.ts"

const siteAuthor: AuthorData = { id: "site", name: "Site Author", links: {} }
const alice: AuthorData = { id: "alice", name: "Alice", links: {} }
const bob: AuthorData = { id: "bob", name: "Bob", links: {} }

function post(
  id: string,
  createdAt: string,
  data: Partial<Post["data"]> = {},
  html = "<p>One two three.</p>",
): Post {
  return {
    id,
    collection: "blog",
    body: "",
    data: {
      title: id,
      createdAt: new Date(createdAt),
      lang: "ja",
      tags: [],
      authors: [],
      draft: false,
      ...data,
    },
    rendered: { html },
  }
}

function loader(posts: Post[], cache = true, authors = [alice, bob]) {
  return createBlogDataLoader({
    loadPosts: async () => posts,
    loadAuthors: async () => authors.map((data) => ({ id: data.id, data })),
    siteAuthor,
    locale: "ja-JP",
    cache,
  })
}

void test("published catalog excludes drafts and orders main posts and subposts", async () => {
  const entries = [
    post("series/late", "2025-01-03", { order: -10 }),
    post("old", "2024-01-01"),
    post("series/tie-b", "2025-01-02", { order: 2 }),
    post("series", "2025-01-01"),
    post("series/tie-a", "2025-01-02", { order: 1 }),
    post("series/first", "2025-01-01"),
    post("draft", "2026-01-01", { draft: true }),
    post("series/draft", "2025-01-01", { draft: true }),
    post("new-en", "2025-02-01", { lang: "en" }),
    post("series/nested/child", "2025-01-04"),
  ]
  const catalog = await loader(entries)()
  assert.deepEqual(
    catalog.posts.map(({ id }) => id),
    [
      "series/late",
      "old",
      "series/tie-b",
      "series",
      "series/tie-a",
      "series/first",
      "new-en",
      "series/nested/child",
    ],
  )
  assert.deepEqual(
    catalog.mainPosts.map(({ id }) => id),
    ["new-en", "series", "old"],
  )
  assert.deepEqual(
    catalog.subpostsByParent.get("series")?.map(({ id }) => id),
    [
      "series/first",
      "series/tie-a",
      "series/tie-b",
      "series/late",
      "series/nested/child",
    ],
  )
  assert.equal(catalog.metadata.has("draft"), false)
  assert.equal(catalog.metadata.has("series/draft"), false)
  assert.equal(catalog.metadata.get("series")?.combinedWordCount, 18)
  assert.equal(catalog.metadata.get("series")?.subpostCount, 5)
  assert.equal(catalog.metadata.get("series/late")?.combinedWordCount, null)
  assert.equal(catalog.metadata.get("series/late")?.isSubpost, true)
  assert.equal(catalog.metadata.get("old")?.hasSubposts, false)
})

void test("metadata preserves frontmatter and ordered authors with a site fallback", async () => {
  const entry = post("authored", "2025-01-01", {
    authors: [
      { collection: "people", id: "bob" },
      { collection: "people", id: "missing" },
      { collection: "people", id: "alice" },
    ],
    tags: ["astro"],
    description: "A description",
    routeSlug: "shared",
    stage: "budding",
    audience: "Readers",
  })
  const catalog = await loader([
    entry,
    post("unknown", "2025-01-01", {
      authors: [{ collection: "people", id: "missing" }],
    }),
    post("no-authors", "2025-01-01"),
    post("no-rendered", "2025-01-01", {}, ""),
  ])()
  assert.deepEqual(catalog.metadata.get("authored"), {
    ...entry.data,
    id: "authored",
    authors: [bob, alice],
    wordCount: 3,
    combinedWordCount: null,
    isSubpost: false,
    subpostCount: 0,
    hasSubposts: false,
  })
  assert.deepEqual(catalog.metadata.get("unknown")?.authors, [siteAuthor])
  assert.deepEqual(catalog.metadata.get("no-authors")?.authors, [siteAuthor])
  assert.equal(catalog.metadata.get("no-rendered")?.wordCount, 0)
})

void test("build requests share concurrent loads and overlapping metadata", async () => {
  let postLoads = 0
  let authorLoads = 0
  const load = createBlogDataLoader({
    loadPosts: async () => {
      postLoads++
      return [post("one", "2025-01-01"), post("two", "2025-01-02")]
    },
    loadAuthors: async () => {
      authorLoads++
      return []
    },
    siteAuthor,
    locale: "ja-JP",
    cache: true,
  })
  const [first, second] = await Promise.all([load(), load()])
  const third = await load()
  assert.equal(first.metadata.get("one"), second.metadata.get("one"))
  assert.equal(second.metadata.get("two"), third.metadata.get("two"))
  assert.equal(postLoads, 1)
  assert.equal(authorLoads, 1)
})

void test("development requests see changed posts and authors without a persistent cache", async () => {
  let entries = [
    post("before", "2025-01-01", {
      authors: [{ collection: "people", id: "alice" }],
    }),
  ]
  let author = alice
  const load = createBlogDataLoader({
    loadPosts: async () => entries,
    loadAuthors: async () => [{ id: "alice", data: author }],
    siteAuthor,
    locale: "ja-JP",
    cache: false,
  })
  const first = await load()
  entries = [
    post("after", "2025-01-02", {
      authors: [{ collection: "people", id: "alice" }],
    }),
  ]
  author = { ...alice, name: "Edited Alice" }
  const second = await load()
  assert.deepEqual(
    first.posts.map(({ id }) => id),
    ["before"],
  )
  assert.deepEqual(
    second.posts.map(({ id }) => id),
    ["after"],
  )
  assert.equal(second.metadata.get("after")?.authors[0].name, "Edited Alice")
  assert.equal(second.metadata.has("before"), false)
})

void test("word counts ignore code, styles, scripts and math", () => {
  const html = `<p>One two three.</p>
<style>ignored words</style><script>ignored words</script>
<pre><code>ignored words</code></pre><code>ignored</code>
<math-inline>ignored</math-inline><math-display>ignored</math-display>
<math><mi>ignored</mi></math> $$ignored words$$ $ignored$`
  assert.equal(calculateWordCountFromHtml(html, "ja-JP"), 3)
  assert.equal(calculateWordCountFromHtml(undefined, "ja-JP"), 0)
})

void test("word counts retain multilingual fallback when the segmenter cannot initialize", () => {
  assert.equal(
    calculateWordCountFromHtml(
      "<p>Hello 日本語 العربية русский עברית</p>",
      "invalid_locale",
    ),
    7,
  )
})
