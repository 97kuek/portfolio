import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { after, before, beforeEach, test } from "node:test"
import { fileURLToPath } from "node:url"
import { getPlatformProxy, type PlatformProxy } from "wrangler"

import { onRequestGet, onRequestPost } from "../functions/api/comments.ts"
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

const postRequest = (body = "A comment", target = "blog:test") =>
  new Request("https://portfolio.example/api/comments", {
    method: "POST",
    headers: {
      origin: "https://portfolio.example",
      "content-type": "application/json",
      "cf-connecting-ip": "192.0.2.10",
      "user-agent": "comments-api-test",
    },
    body: JSON.stringify({ target, body, author: " Reader " }),
  })

const list = (query = "target=blog:test") =>
  onRequestGet({
    request: new Request(`https://portfolio.example/api/comments?${query}`),
    env,
  })

const seed = async (
  count: number,
  hash = "fixture",
  createdAt = new Date().toISOString(),
) => {
  await platform.env.DB.batch(
    Array.from({ length: count }, (_, i) =>
      platform.env.DB.prepare(
        "INSERT INTO comments (id, target, body, created_at, client_hash, visible) VALUES (?, ?, ?, ?, ?, 1)",
      ).bind(i + 1, "blog:test", `comment-${i + 1}`, createdAt, hash),
    ),
  )
}

before(async () => {
  platform = await getPlatformProxy<{ DB: LocalDatabase }>({
    configPath: fileURLToPath(
      new URL("./fixtures/wrangler.comments.jsonc", import.meta.url),
    ),
    envFiles: [],
    persist: false,
    remoteBindings: false,
  })
  env = { DB: platform.env.DB, INTERACTION_SALT: "local-test-salt" }
  const migration = await readFile(
    new URL("../migrations/0001_interactions.sql", import.meta.url),
    "utf8",
  )
  const sql = migration
    .replace(/--[^\n]*/g, "")
    .split(";")
    .filter((value) => value.trim())
  await platform.env.DB.batch(
    sql.map((statement) => platform.env.DB.prepare(statement)),
  )
})

after(async () => {
  await platform?.dispose()
})
beforeEach(async () => {
  await env.DB.prepare("DELETE FROM comments").run()
  await env.DB.prepare(
    "DELETE FROM sqlite_sequence WHERE name = 'comments'",
  ).run()
})

void test("concurrent requests cannot save more than five comments per client across targets", async () => {
  const responses = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      onRequestPost({
        request: postRequest(
          `comment-${i}`,
          i % 2 ? "blog:test" : "projects:test",
        ),
        env,
      }),
    ),
  )
  assert.equal(responses.filter(({ status }) => status === 201).length, 5)
  assert.equal(responses.filter(({ status }) => status === 429).length, 5)
  assert.equal(
    (
      await env.DB.prepare("SELECT COUNT(*) AS count FROM comments").first<{
        count: number
      }>()
    )?.count,
    5,
  )
})

void test("comments older than one hour do not prevent a new post", async () => {
  const hash = await getClientHash(postRequest(), env)
  await seed(5, hash, new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
  const response = await onRequestPost({ request: postRequest(), env })
  assert.equal(response.status, 201)
})

void test("cursor pagination returns every public comment once in chronological order", async () => {
  await seed(405)
  await env.DB.prepare("UPDATE comments SET visible = 0 WHERE id = 404").run()
  await env.DB.prepare(
    "UPDATE comments SET target = 'projects:test' WHERE id = 405",
  ).run()
  const first = await (await list()).json()
  assert.equal(first.comments.length, 200)
  assert.equal(first.comments[0].id, 204)
  assert.equal(first.comments.at(-1).id, 403)
  assert.equal(first.nextCursor, 204)
  const second = await (
    await list(`target=blog:test&before=${first.nextCursor}`)
  ).json()
  assert.equal(second.comments[0].id, 4)
  assert.equal(second.comments.at(-1).id, 203)
  assert.equal(second.nextCursor, 4)
  const third = await (
    await list(`target=blog:test&before=${second.nextCursor}`)
  ).json()
  assert.deepEqual(
    third.comments.map(({ id }: { id: number }) => id),
    [1, 2, 3],
  )
  assert.equal(third.nextCursor, null)
})

void test("posting after 200 comments returns the newly saved comment", async () => {
  await seed(200)
  const response = await onRequestPost({
    request: postRequest("<script>literal text</script>"),
    env,
  })
  assert.equal(response.status, 201)
  const payload = await response.json()
  assert.equal(payload.nextCursor, 2)
  const posted = payload.comments.at(-1)
  assert.deepEqual(posted, {
    id: 201,
    author: "Reader",
    body: "<script>literal text</script>",
    createdAt: posted?.createdAt,
  })
  assert.equal(Number.isNaN(Date.parse(posted.createdAt)), false)
  assert.equal(payload.pending, false)
  assert.equal("client_hash" in posted, false)
})

void test("moderated comments stay private but still count toward the rate limit", async () => {
  const moderated = { ...env, COMMENT_MODERATION: "1" }
  for (let i = 0; i < 5; i++) {
    const response = await onRequestPost({
      request: postRequest(),
      env: moderated,
    })
    assert.equal(response.status, 201)
    assert.deepEqual(await response.json(), {
      comments: [],
      nextCursor: null,
      pending: true,
    })
  }
  assert.equal(
    (await onRequestPost({ request: postRequest(), env: moderated })).status,
    429,
  )
  assert.deepEqual(await (await list()).json(), {
    comments: [],
    nextCursor: null,
  })
})

void test("invalid pagination cursors return 400", async () => {
  for (const cursor of [
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    "Infinity",
    "9007199254740992",
    "abc",
  ]) {
    assert.equal(
      (await list(`target=blog:test&before=${cursor}`)).status,
      400,
      cursor,
    )
  }
})

void test("empty pages have no continuation cursor", async () => {
  assert.deepEqual(await (await list()).json(), {
    comments: [],
    nextCursor: null,
  })
  assert.deepEqual(await (await list("target=blog:test&before=1")).json(), {
    comments: [],
    nextCursor: null,
  })
})

void test("rejected requests do not save comments", async () => {
  const crossOrigin = postRequest()
  crossOrigin.headers.set("origin", "https://attacker.example")
  assert.equal((await onRequestPost({ request: crossOrigin, env })).status, 403)
  assert.equal(
    (await onRequestPost({ request: postRequest("  "), env })).status,
    400,
  )
  assert.equal(
    (
      await env.DB.prepare("SELECT COUNT(*) AS count FROM comments").first<{
        count: number
      }>()
    )?.count,
    0,
  )
})
