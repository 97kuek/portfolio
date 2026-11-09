import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const script = fileURLToPath(
  new URL("../scripts/ci-scope.mjs", import.meta.url),
)

function repository(t) {
  const root = mkdtempSync(path.join(tmpdir(), "portfolio-ci-scope-"))
  const cwd = path.join(root, "repository")
  mkdirSync(cwd)
  t.after(() => rmSync(root, { recursive: true, force: true }))
  function git(...args) {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  function commit(files) {
    for (const [name, contents] of Object.entries(files)) {
      const target = path.join(cwd, name)
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, contents)
    }
    git("add", "--all")
    git("commit", "--quiet", "--allow-empty", "-m", "test change")
    return git("rev-parse", "HEAD")
  }
  function classify(eventName, event) {
    const eventPath = path.join(root, "event.json")
    const outputPath = path.join(root, "output.txt")
    writeFileSync(
      eventPath,
      typeof event === "string" ? event : JSON.stringify(event),
    )
    writeFileSync(outputPath, "")
    const result = spawnSync(process.execPath, [script], {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: eventName,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
      },
    })
    return { ...result, output: readFileSync(outputPath, "utf8") }
  }
  git("init", "--quiet")
  git("config", "user.name", "CI scope test")
  git("config", "user.email", "ci-scope@example.invalid")
  const base = commit({ "README.md": "Initial documentation\n" })
  return { cwd, git, commit, classify, base }
}

void test("documentation-only PRs pass without a dependency installation", (t) => {
  const repo = repository(t)
  const head = repo.commit({
    "README.md": "Updated documentation\n",
    "CONTRIBUTING.md": "Contributions\n",
    "DEVELOPMENT.md": "Development\n",
    "AGENTS.md": "Instructions\n",
    "docs/nested/日本語 notes\nwith newline.md": "Documentation\n",
  })
  repo.commit({ "src/later-change.js": "export const unrelated = true\n" })
  const result = repo.classify("pull_request", {
    pull_request: { base: { sha: repo.base }, head: { sha: head } },
  })
  assert.equal(result.output, "docs_only=true\n", result.stderr)
  assert.equal(result.status, 0, result.stderr)
})

void test("every path outside the documentation allowlist requires full CI", (t) => {
  const repo = repository(t)
  for (const name of [
    "src/content/blog/post.md",
    "src/content/projects/README.md",
    "public/guide.md",
    "tests/example.test.mjs",
    ".github/workflows/ci.yml",
    ".pages.yml",
    "package.json",
    "pnpm-lock.yaml",
    "new-unknown-file.md",
    "docs-sibling/guide.md",
  ]) {
    const before = repo.git("rev-parse", "HEAD")
    const head = repo.commit({ [name]: "Changed\n" })
    const result = repo.classify("push", { before, after: head })
    assert.equal(result.output, "docs_only=false\n", name)
    assert.equal(result.status, 0, result.stderr)
  }
})

void test("a multi-commit push includes earlier runtime changes", (t) => {
  const repo = repository(t)
  repo.commit({ "src/runtime.js": "export const value = 1\n" })
  const head = repo.commit({ "README.md": "Last commit only edits docs\n" })
  const result = repo.classify("push", { before: repo.base, after: head })
  assert.equal(result.output, "docs_only=false\n", result.stderr)
})

void test("deletions and renames cannot hide runtime paths under docs", (t) => {
  const repo = repository(t)
  const before = repo.commit({ "src/runtime.js": "export const value = 1\n" })
  repo.git("mv", "src/runtime.js", "docs-runtime.md")
  mkdirSync(path.join(repo.cwd, "docs"))
  repo.git("mv", "docs-runtime.md", "docs/runtime.md")
  const head = repo.commit({})
  assert.equal(
    repo.classify("push", { before, after: head }).output,
    "docs_only=false\n",
  )
  const next = repo.commit({ "public/runtime.txt": "Runtime\n" })
  repo.git("rm", "public/runtime.txt")
  const deleted = repo.commit({ "README.md": "Documentation too\n" })
  assert.equal(
    repo.classify("push", { before: next, after: deleted }).output,
    "docs_only=false\n",
  )
})

void test("documentation deletion remains eligible for the fast path", (t) => {
  const repo = repository(t)
  const before = repo.commit({ "docs/old.md": "Old documentation\n" })
  repo.git("rm", "docs/old.md")
  const head = repo.commit({})
  assert.equal(
    repo.classify("push", { before, after: head }).output,
    "docs_only=true\n",
  )
})

void test("manual, unknown, empty, invalid and unavailable ranges use full CI", (t) => {
  const repo = repository(t)
  const head = repo.commit({ "README.md": "Updated documentation\n" })
  for (const [eventName, event] of [
    ["workflow_dispatch", { before: repo.base, after: head }],
    ["unknown", { before: repo.base, after: head }],
    ["push", { before: "0".repeat(40), after: head }],
    ["push", { before: "f".repeat(40), after: head }],
    ["push", { before: "--help", after: head }],
    ["push", { before: repo.base }],
    ["push", { before: head, after: head }],
    ["pull_request", {}],
    ["push", "malformed event JSON"],
    ["push", null],
  ]) {
    const result = repo.classify(eventName, event)
    assert.equal(result.output, "docs_only=false\n", JSON.stringify(event))
    assert.equal(result.status, 0, result.stderr)
  }
})

void test("documentation whitespace errors fail the cheap check", (t) => {
  const repo = repository(t)
  const head = repo.commit({ "README.md": "Trailing whitespace   \n" })
  const result = repo.classify("push", { before: repo.base, after: head })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Documentation whitespace check failed/)
})
