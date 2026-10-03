import { copyFile } from "node:fs/promises"

// Pages chooses the nearest ancestor's 404.html. Astro nests non-root routes.
await copyFile("dist/en/404/index.html", "dist/en/404.html")
