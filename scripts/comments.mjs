#!/usr/bin/env node
/**
 * Moderation for the D1-backed comments, wrapping wrangler so there is no
 * second set of credentials to manage. Hiding sets `visible = 0`, which the
 * API filters on, and keeps the row for reference; delete is unrecoverable.
 *
 *   pnpm comments list [target]
 *   pnpm comments hide <id>
 *   pnpm comments show <id>
 *   pnpm comments delete <id>
 *   pnpm comments backup [file.sql]
 */
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

/* Read from the deployment config so the name is written down once. */
const wrangler = JSON.parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
)
const DATABASE = wrangler.d1_databases?.[0]?.database_name

if (!DATABASE) {
  console.error("No d1_databases entry in wrangler.jsonc")
  process.exit(1)
}
const [command, ...args] = process.argv.slice(2)

const run = (wranglerArgs) => {
  const result = spawnSync("npx", ["wrangler", ...wranglerArgs], {
    stdio: "inherit",
  })
  process.exitCode = result.status ?? 1
}

const sql = (statement) =>
  run(["d1", "execute", DATABASE, "--remote", "--command", statement])

const requireId = () => {
  const id = Number(args[0])
  if (!Number.isInteger(id) || id <= 0) {
    console.error(`Expected a numeric comment id, got: ${args[0] ?? "nothing"}`)
    process.exit(1)
  }
  return id
}

const escape = (value) => value.replace(/'/g, "''")

switch (command) {
  case "list": {
    const where = args[0] ? ` WHERE target = '${escape(args[0])}'` : ""
    sql(
      `SELECT id, target, author, visible, created_at, substr(body, 1, 80) AS preview FROM comments${where} ORDER BY id DESC LIMIT 100;`,
    )
    break
  }
  case "hide":
    sql(`UPDATE comments SET visible = 0 WHERE id = ${requireId()};`)
    break
  case "show":
    sql(`UPDATE comments SET visible = 1 WHERE id = ${requireId()};`)
    break
  case "delete":
    sql(`DELETE FROM comments WHERE id = ${requireId()};`)
    break
  case "backup": {
    const output = args[0] ?? `comments-backup-${Date.now()}.sql`
    run(["d1", "export", DATABASE, "--remote", "--output", output])
    break
  }
  default:
    console.error(
      "Usage: pnpm comments <list|hide|show|delete|backup> [argument]",
    )
    process.exit(1)
}
