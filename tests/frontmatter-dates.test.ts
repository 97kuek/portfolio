import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import type { Loader, LoaderContext } from "astro/loaders"

import { preserveFrontmatterDates } from "../src/lib/frontmatter-dates.ts"

async function loadEntry(source: string, data: Record<string, unknown>) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-date-frontmatter-"))
  try {
    const filePath = join(directory, "post.md")
    await writeFile(filePath, source)
    let validated: Record<string, unknown> | undefined
    const loader: Loader = {
      name: "fixture",
      async load(context) {
        validated = await context.parseData({ id: "post", filePath, data })
      },
    }
    await preserveFrontmatterDates(loader, ["createdAt", "updatedAt"]).load({
      parseData: async ({ data }) => data,
    } as LoaderContext)
    return validated
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

void test("frontmatter dates reach schema validation without YAML timestamp normalization", async () => {
  const validated = await loadEntry(
    `---
title: Example
createdAt: 2026-02-30
updatedAt: 2026-03-05T12:00:00+09:00
draft: false
---
Body with createdAt: 2026-01-01
`,
    {
      title: "Example",
      createdAt: new Date("2026-03-02T00:00:00Z"),
      updatedAt: new Date("2026-03-05T03:00:00Z"),
      draft: false,
    },
  )
  assert.deepEqual(validated, {
    title: "Example",
    createdAt: "2026-02-30",
    updatedAt: "2026-03-05T12:00:00+09:00",
    draft: false,
  })
})

void test("delimiter whitespace cannot bypass raw date validation", async () => {
  const validated = await loadEntry(
    "\uFEFF---  \r\ncreatedAt: 2026-02-30\r\n---  \r\nBody\r\n",
    { createdAt: new Date("2026-03-02T00:00:00Z") },
  )
  assert.equal(validated?.createdAt, "2026-02-30")
})

void test("dates inherited from YAML merge keys retain their scalar value", async () => {
  const validated = await loadEntry(
    `---
defaults: &defaults
  createdAt: 2026-02-28
<<: *defaults
---
Body
`,
    { createdAt: new Date("2026-02-28T00:00:00Z") },
  )
  assert.equal(validated?.createdAt, "2026-02-28")
})
