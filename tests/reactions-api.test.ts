import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { after, before, beforeEach, test } from "node:test"
import { fileURLToPath } from "node:url"
import { getPlatformProxy, type PlatformProxy } from "wrangler"

import { onRequestGet, onRequestPost } from "../functions/api/reactions.ts"
import {
  getClientHash,
  type D1Database,
  type D1PreparedStatement,
  type Env,
} from "../functions/api/_lib.ts"

interface LocalDatabase extends D1Database {
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>
}

let platform: PlatformProxy<{ DB: LocalDatabase }>
let env: Env

const postRequest = (target = "blog:test", kind = "like", ip = "192.0.2.10") =>
  new Request("https://portfolio.example/api/reactions", {
    method: "POST",
    headers: {
      origin: "https://portfolio.example",
      "content-type": "application/json",
      "cf-connecting-ip": ip,
      "user-agent": "reactions-api-test",
    },
    body: JSON.stringify({ target, kind }),
  })

const state = async (target = "blog:test", ip = "192.0.2.10") => {
  const response = await onRequestGet({
    request: new Request(
      `https://portfolio.example/api/reactions?${new URLSearchParams({ target })}`,
      {
        headers: {
          "cf-connecting-ip": ip,
          "user-agent": "reactions-api-test",
        },
      },
    ),
    env,
  })
  assert.equal(response.status, 200)
  return response.json()
}

const createLocalPlatform = () =>
  getPlatformProxy<{ DB: LocalDatabase }>({
    configPath: fileURLToPath(
      new URL("./fixtures/wrangler.comments.jsonc", import.meta.url),
    ),
    envFiles: [],
    persist: false,
    remoteBindings: false,
  })
const applyMigration = async (db: LocalDatabase, name: string) => {
  const migration = await readFile(
    new URL(`../migrations/${name}`, import.meta.url),
    "utf8",
  )
  const statements = migration
    .replace(/--[^\n]*/g, "")
    .split(";")
    .filter((statement) => statement.trim())
  await db.batch(statements.map((statement) => db.prepare(statement)))
}

before(async () => {
  platform = await createLocalPlatform()
  env = { DB: platform.env.DB, INTERACTION_SALT: "local-test-salt" }
  await applyMigration(platform.env.DB, "0001_interactions.sql")
  await applyMigration(platform.env.DB, "0002_reaction_active.sql")
})

after(async () => {
  await platform?.dispose()
})

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM reactions").run()
})

for (const [initiallySelected, presses, selected] of [
  [false, 2, false],
  [false, 3, true],
  [false, 10, false],
  [false, 11, true],
  [true, 2, true],
  [true, 3, false],
  [true, 10, true],
  [true, 11, false],
] as const) {
  void test(`${presses} concurrent presses from ${initiallySelected ? "selected" : "unselected"} leave the reaction ${selected ? "selected" : "unselected"}`, async () => {
    if (initiallySelected) {
      const response = await onRequestPost({ request: postRequest(), env })
      assert.equal(response.status, 200)
    }
    const responses = await Promise.all(
      Array.from({ length: presses }, () =>
        onRequestPost({ request: postRequest(), env }),
      ),
    )
    assert.ok(responses.every(({ status }) => status === 200))
    assert.deepEqual(await state(), {
      counts: { like: selected ? 1 : 0, insight: 0 },
      mine: selected ? ["like"] : [],
    })
  })
}

void test("the active migration preserves existing selected reactions", async () => {
  const legacyPlatform = await createLocalPlatform()
  try {
    const db = legacyPlatform.env.DB
    await applyMigration(db, "0001_interactions.sql")
    const hash = await getClientHash(postRequest(), env)
    await db
      .prepare(
        "INSERT INTO reactions (target, kind, client_hash, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind("blog:test", "like", hash, "2026-01-01T00:00:00.000Z")
      .run()
    await applyMigration(db, "0002_reaction_active.sql")
    assert.deepEqual(
      await db
        .prepare("SELECT target, kind, created_at, active FROM reactions")
        .first(),
      {
        target: "blog:test",
        kind: "like",
        created_at: "2026-01-01T00:00:00.000Z",
        active: 1,
      },
    )
    const response = await onRequestPost({
      request: postRequest(),
      env: { ...env, DB: db },
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      counts: { like: 0, insight: 0 },
      mine: [],
    })
  } finally {
    await legacyPlatform.dispose()
  }
})

void test("sequential presses select, cancel and reselect one reaction", async () => {
  for (const expected of [
    { counts: { like: 1, insight: 0 }, mine: ["like"] },
    { counts: { like: 0, insight: 0 }, mine: [] },
    { counts: { like: 1, insight: 0 }, mine: ["like"] },
  ]) {
    const response = await onRequestPost({ request: postRequest(), env })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), expected)
    assert.deepEqual(await state(), expected)
  }
})

void test("toggles are independent across clients, targets and reaction kinds", async () => {
  for (const request of [
    postRequest(),
    postRequest("blog:test", "like", "192.0.2.11"),
    postRequest("blog:test", "insight"),
    postRequest("projects:test"),
    postRequest(),
  ]) {
    assert.equal((await onRequestPost({ request, env })).status, 200)
  }
  assert.deepEqual(await state(), {
    counts: { like: 1, insight: 1 },
    mine: ["insight"],
  })
  assert.deepEqual(await state("blog:test", "192.0.2.11"), {
    counts: { like: 1, insight: 1 },
    mine: ["like"],
  })
  assert.deepEqual(await state("projects:test"), {
    counts: { like: 1, insight: 0 },
    mine: ["like"],
  })
})

void test("invalid requests do not change reactions", async () => {
  for (const request of [
    postRequest("invalid"),
    postRequest("blog:test", "unknown"),
  ]) {
    assert.equal((await onRequestPost({ request, env })).status, 400)
  }
  const invalidJson = postRequest()
  invalidJson.headers.set("content-type", "text/plain")
  assert.equal((await onRequestPost({ request: invalidJson, env })).status, 400)
  const crossOrigin = postRequest()
  crossOrigin.headers.set("origin", "https://attacker.example")
  assert.equal((await onRequestPost({ request: crossOrigin, env })).status, 403)
  assert.equal(
    (
      await onRequestGet({
        request: new Request(
          "https://portfolio.example/api/reactions?target=invalid",
        ),
        env,
      })
    ).status,
    400,
  )
  assert.deepEqual(await state(), {
    counts: { like: 0, insight: 0 },
    mine: [],
  })
})

void test("missing interaction salt disables reads and writes without changing reactions", async () => {
  const unconfigured = { DB: env.DB }
  assert.equal(
    (await onRequestPost({ request: postRequest(), env: unconfigured })).status,
    503,
  )
  assert.equal(
    (
      await onRequestGet({
        request: new Request(
          "https://portfolio.example/api/reactions?target=blog:test",
        ),
        env: unconfigured,
      })
    ).status,
    503,
  )
  assert.deepEqual(await state(), {
    counts: { like: 0, insight: 0 },
    mine: [],
  })
})
