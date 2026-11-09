import { readdir, rename } from "node:fs/promises"
import path from "node:path"

const root = path.resolve("dist")

// Cloudflare serves /page.html at /page, while /page/index.html redirects to
// /page/. Keep Astro's rendered extensionless URLs and match that contract in
// the uploaded files. The root stays index.html; localized 404s become 404.html.
const preparePages = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await preparePages(file)
    else if (entry.name === "index.html" && directory !== root) {
      await rename(file, `${directory}.html`)
    }
  }
}

await preparePages(root)
