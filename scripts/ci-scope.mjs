import { spawnSync } from "node:child_process"
import { appendFileSync, readFileSync } from "node:fs"

const documentationFiles = new Set([
  "README.md",
  "CONTRIBUTING.md",
  "DEVELOPMENT.md",
  "AGENTS.md",
])

function documentationRange() {
  try {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    )
    let base
    let head
    if (process.env.GITHUB_EVENT_NAME === "pull_request") {
      base = event.pull_request?.base?.sha
      head = event.pull_request?.head?.sha
    } else if (process.env.GITHUB_EVENT_NAME === "push") {
      base = event.before
      head = event.after
    } else {
      return null
    }
    const validSha = (sha) =>
      typeof sha === "string" &&
      /^[0-9a-f]{40}$/i.test(sha) &&
      !/^0+$/.test(sha)
    if (!validSha(base) || !validSha(head)) return null

    // Count both sides of a rename so a runtime file moved into docs stays full CI.
    const diff = spawnSync(
      "git",
      [
        "diff",
        "--no-ext-diff",
        "--no-renames",
        "--name-only",
        "-z",
        base,
        head,
        "--",
      ],
      { encoding: "utf8" },
    )
    if (diff.status !== 0 || !diff.stdout.endsWith("\0")) return null
    const files = diff.stdout.slice(0, -1).split("\0")
    return files.every(
      (file) => documentationFiles.has(file) || file.startsWith("docs/"),
    )
      ? { base, head }
      : null
  } catch {
    // Missing event data or unavailable history must never enable the fast path.
    return null
  }
}

const range = documentationRange()
if (range) {
  const whitespace = spawnSync(
    "git",
    [
      "diff",
      "--no-ext-diff",
      "--no-renames",
      "--check",
      range.base,
      range.head,
      "--",
    ],
    { encoding: "utf8" },
  )
  if (whitespace.status !== 0) {
    console.error(
      "Documentation whitespace check failed; run git diff --check for the event range.",
    )
    process.exit(1)
  }
}
appendFileSync(process.env.GITHUB_OUTPUT, `docs_only=${Boolean(range)}\n`)
console.log(
  range
    ? "Documentation-only changes: whitespace check passed; full CI is skipped."
    : "Full validation is required.",
)
