import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

void test("Pages output serves extensionless routes without directory redirects", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "portfolio-pages-"))
  const pages = [
    "index.html",
    "404.html",
    "en/index.html",
    "en/404/index.html",
    "blog/hello/index.html",
    "en/blog/hello/index.html",
    "blog/tags/学習ノート/index.html",
    "img/example.html",
  ]
  try {
    for (const page of pages) {
      const file = path.join(root, "dist", page)
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, `<html><head></head><body>${page}</body></html>`)
    }
    await promisify(execFile)(
      process.execPath,
      [fileURLToPath(new URL("../scripts/prepare-pages.mjs", import.meta.url))],
      { cwd: root },
    )
    for (const page of pages) {
      const target =
        page === "index.html" ? page : page.replace(/\/index\.html$/, ".html")
      assert.equal(
        await readFile(path.join(root, "dist", target), "utf8"),
        `<html><head></head><body>${page}</body></html>`,
      )
      if (target !== page)
        await assert.rejects(access(path.join(root, "dist", page)), {
          code: "ENOENT",
        })
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
