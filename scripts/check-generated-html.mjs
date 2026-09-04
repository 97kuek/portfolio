import assert from "node:assert/strict"
import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

import { inlineScripts, scriptHash } from "./add-csp-meta.mjs"

const distDir = path.resolve("dist")
const headers = await readFile(path.join(distDir, "_headers"), "utf8")

for (const header of [
  "Content-Security-Policy",
  "Permissions-Policy",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
]) {
  assert.match(headers, new RegExp(`^  ${header}:`, "m"), `Missing ${header}`)
}
assert.match(
  headers,
  /'wasm-unsafe-eval'/,
  "Pagefind WebAssembly must be allowed",
)

const collectHtml = async (directory) => {
  const entries = await readdir(directory)
  const files = []

  for (const entry of entries) {
    const file = path.join(directory, entry)
    if ((await stat(file)).isDirectory())
      files.push(...(await collectHtml(file)))
    else if (entry.endsWith(".html")) files.push(file)
  }

  return files
}

const outputForPath = async (pathname) => {
  const relative = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, "")
  const candidates = relative
    ? [
        path.join(distDir, relative, "index.html"),
        path.join(distDir, `${relative}.html`),
      ]
    : [path.join(distDir, "index.html")]

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate
    } catch {
      // Try Astro's other static output shape.
    }
  }
  return null
}

const readOutput = async (pathname) => {
  const file = await outputForPath(pathname)
  assert.ok(file, `Missing generated page for ${pathname}`)
  return readFile(file, "utf8")
}

const getStructuredData = (html, pathname) => {
  const match = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  )
  assert.ok(match, `Missing JSON-LD on ${pathname}`)
  return JSON.parse(match[1])
}

const htmlFiles = await collectHtml(distDir)
assert.ok(htmlFiles.length > 0, "No generated HTML found; run pnpm build first")

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8")
  const relative = path.relative(distDir, file)
  assert.match(
    html,
    /<main[^>]*id="main-content"/,
    `${relative}: missing main landmark target`,
  )
  assert.match(
    html,
    /class="skip-link"[^>]*href="#main-content"/,
    `${relative}: missing skip link`,
  )
  assert.doesNotMatch(
    html,
    /cdn\.jsdelivr\.net\/npm\/medium-zoom/,
    `${relative}: medium-zoom must be self-hosted`,
  )

  /* The page policy has to name every inline script by hash, and has to be
     parsed before the first one runs. A script left out would be blocked in
     the browser and nowhere else, so the failure has to surface here. */
  const policy = html.match(
    /<meta http-equiv="content-security-policy" content="([^"]*)">/,
  )
  assert.ok(policy, `${relative}: missing the page's script policy`)
  assert.doesNotMatch(
    policy[1],
    /'unsafe-inline'/,
    `${relative}: the page policy must pin scripts by hash`,
  )
  assert.ok(
    html.indexOf(policy[0]) < html.indexOf("<script"),
    `${relative}: the policy must come before the first script`,
  )
  for (const body of inlineScripts(html)) {
    assert.ok(
      policy[1].includes(scriptHash(body)),
      `${relative}: inline script is not in the policy: ${body.slice(0, 60).trim()}…`,
    )
  }

  if (!relative.startsWith(`en${path.sep}`)) {
    assert.doesNotMatch(
      html,
      /aria-label="(?:Navigate to|Send email|Copy email|Subposts navigation|Current (?:post|subpost)|Parent post)/,
      `${relative}: English-only accessible label on a Japanese page`,
    )
  }

  for (const match of html.matchAll(
    /<link[^>]*rel="alternate"[^>]*hreflang="[^"]+"[^>]*href="([^"]+)"/g,
  )) {
    const alternate = new URL(match[1])
    assert.ok(
      await outputForPath(alternate.pathname),
      `${relative}: hreflang points to missing ${alternate.pathname}`,
    )
  }
}

for (const [pathname, expectedType] of [
  ["/", "ProfilePage"],
  ["/en", "ProfilePage"],
  ["/blog/hello", "BlogPosting"],
  ["/projects/wasa-chat", "SoftwareSourceCode"],
]) {
  const data = getStructuredData(await readOutput(pathname), pathname)
  assert.equal(data["@type"], expectedType, `${pathname}: wrong JSON-LD type`)
}

await readOutput("/privacy")
await readOutput("/en/privacy")
console.log(`Checked ${htmlFiles.length} generated HTML files.`)
