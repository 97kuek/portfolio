#!/usr/bin/env node
/**
 * Walks the built site and reports internal links that lead nowhere.
 *
 * Astro cannot catch these: a href is just a string until someone follows it,
 * and the ones that break are usually the ones a refactor left behind — a
 * locale prefix that moved, a route that was renamed. Runs over `dist`, so it
 * sees exactly what gets deployed.
 */
import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../dist/", import.meta.url))

/** Directories served verbatim; their contents are not routes to resolve. */
const ASSET_PREFIXES = ["/_astro", "/fonts", "/styles", "/img", "/api"]

const exists = async (path) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const collectHtml = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return collectHtml(path)
      return entry.name.endsWith(".html") ? [path] : []
    }),
  )
  return files.flat()
}

const resolves = async (href) => {
  const path = href.split("#")[0].split("?")[0]
  if (path === "" || path === "/") return true
  const target = join(root, path)
  return (
    (await exists(target)) ||
    (await exists(join(target, "index.html"))) ||
    (await exists(`${target}.html`))
  )
}

if (!(await exists(root))) {
  console.error("No dist/ to check. Run `pnpm build` first.")
  process.exit(1)
}

const pages = await collectHtml(root)
const broken = new Map()

for (const page of pages) {
  const html = await readFile(page, "utf8")
  const hrefs = new Set(
    [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]),
  )
  for (const href of hrefs) {
    if (href.startsWith("//")) continue
    if (ASSET_PREFIXES.some((prefix) => href.startsWith(prefix))) continue
    if (await resolves(href)) continue
    const sources = broken.get(href) ?? new Set()
    sources.add(relative(root, page))
    broken.set(href, sources)
  }
}

const byHref = (a, b) => a.localeCompare(b)

for (const [href, sources] of [...broken].sort(([a], [b]) => byHref(a, b))) {
  console.error(`${href}\n  from ${[...sources].sort(byHref).join(", ")}`)
}

console.log(
  `Checked ${pages.length} pages; ${broken.size} broken internal link${
    broken.size === 1 ? "" : "s"
  }.`,
)
process.exitCode = broken.size > 0 ? 1 : 0
