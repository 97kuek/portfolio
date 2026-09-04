import { readdir, readFile, stat, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * Pins each page's inline scripts with a hash-based `script-src`.
 *
 * The header policy in `public/_headers` has to keep `'unsafe-inline'`: one
 * header is served for every page, and a hash is per page. A `<meta>` policy
 * is per page, so it can carry hashes, and a browser enforces both — a script
 * has to satisfy each policy independently. The header therefore says which
 * origins may serve scripts, and the meta says which inline scripts were in
 * the page when it was built. One injected at runtime matches neither hash nor
 * origin.
 *
 * Astro can emit this policy itself, but it hashes only the scripts it
 * bundles; the `is:inline` ones — the theme, the language preference, the copy
 * buttons — are left out and would be blocked. Reading the built HTML is the
 * only place where every script that will actually run is visible.
 *
 * Styles are deliberately absent. A hash in `style-src` makes `'unsafe-inline'`
 * inert, and medium-zoom injects a `<style>` element and animates through
 * inline `style` attributes, so styles stay with the header policy.
 */

const SCRIPT_SOURCES = [
  "'self'",
  // Pagefind's search index is WebAssembly.
  "'wasm-unsafe-eval'",
  "https://static.cloudflareinsights.com",
]

/** Types the browser executes. Anything else is a data block CSP ignores. */
const EXECUTABLE_TYPE = /^(module|text\/javascript|application\/javascript)$/

/** Attribute values may hold `>`, so the tag cannot end at the first one. */
const SCRIPT_TAG = /<script((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/g

const collectHtml = async (directory) => {
  const files = []

  for (const entry of await readdir(directory)) {
    const file = path.join(directory, entry)
    if ((await stat(file)).isDirectory())
      files.push(...(await collectHtml(file)))
    else if (entry.endsWith(".html")) files.push(file)
  }

  return files
}

/** Every inline script the browser will run, in the bytes it will hash. */
export const inlineScripts = (html) => {
  const bodies = []

  for (const [, attributes, body] of html.matchAll(SCRIPT_TAG)) {
    if (/\ssrc\s*=/.test(attributes)) continue
    const type = attributes.match(/\stype\s*=\s*"([^"]*)"/)?.[1]
    if (type && !EXECUTABLE_TYPE.test(type)) continue
    bodies.push(body)
  }

  return bodies
}

export const scriptHash = (body) =>
  `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`

const policyFor = (html) => {
  const hashes = [...new Set(inlineScripts(html).map(scriptHash))]
  return `script-src ${[...SCRIPT_SOURCES, ...hashes].join(" ")}`
}

export const collectGeneratedHtml = collectHtml

const main = async () => {
  const distDir = path.resolve("dist")
  const files = await collectHtml(distDir)
  if (files.length === 0)
    throw new Error("No generated HTML found; run the build first")

  for (const file of files) {
    const html = await readFile(file, "utf8")
    const meta = `<meta http-equiv="content-security-policy" content="${policyFor(html)}">`

    // First in the head, so the policy is in force before anything below it runs.
    const withMeta = html.replace(
      /<head(\s[^>]*)?>/i,
      (head) => `${head}${meta}`,
    )
    if (withMeta === html)
      throw new Error(
        `${path.relative(distDir, file)}: no <head> to put the policy in`,
      )

    await writeFile(file, withMeta)
  }

  console.log(`Pinned inline scripts on ${files.length} pages.`)
}

// Importing this module must not rewrite the build; the checks read from it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main()
