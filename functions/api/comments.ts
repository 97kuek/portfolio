import {
  COMMENT_AUTHOR_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  error,
  getClientHash,
  isSameOrigin,
  isModerated,
  isValidTarget,
  json,
  notifyComment,
  readJson,
  type Env,
  type RequestContext,
} from "./_lib"

interface CommentRow {
  id: number
  author: string | null
  body: string
  created_at: string
}

const MAX_PER_HOUR = 5
const PAGE_SIZE = 200

const serialize = (row: CommentRow) => ({
  id: row.id,
  author: row.author,
  body: row.body,
  createdAt: row.created_at,
})

const listComments = async (env: Env, target: string) => {
  const { results } = await env.DB.prepare(
    "SELECT id, author, body, created_at FROM comments WHERE target = ? AND visible = 1 ORDER BY id ASC LIMIT ?",
  )
    .bind(target, PAGE_SIZE)
    .all<CommentRow>()
  return results.map(serialize)
}

export const onRequestGet = async ({ request, env }: RequestContext) => {
  const target = new URL(request.url).searchParams.get("target")
  if (!isValidTarget(target)) return error("Invalid target", 400)

  return json({ comments: await listComments(env, target) })
}

export const onRequestPost = async ({
  request,
  env,
  waitUntil,
}: RequestContext) => {
  if (!isSameOrigin(request)) return error("Cross-origin request", 403)

  const payload = await readJson(request)
  if (!payload) return error("Expected a JSON body", 400)

  const { target } = payload
  if (!isValidTarget(target)) return error("Invalid target", 400)

  const body = typeof payload.body === "string" ? payload.body.trim() : ""
  if (!body) return error("Comment is empty", 400)
  if (body.length > COMMENT_MAX_LENGTH) return error("Comment is too long", 400)

  const rawAuthor =
    typeof payload.author === "string" ? payload.author.trim() : ""
  const author = rawAuthor
    ? rawAuthor.slice(0, COMMENT_AUTHOR_MAX_LENGTH)
    : null

  const clientHash = await getClientHash(request, env)
  const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM comments WHERE client_hash = ? AND created_at > ?",
  )
    .bind(clientHash, anHourAgo)
    .first<{ count: number }>()

  if (Number(recent?.count ?? 0) >= MAX_PER_HOUR) {
    return error("Too many comments in a short time", 429)
  }

  const pending = isModerated(env)
  await env.DB.prepare(
    "INSERT INTO comments (target, author, body, created_at, client_hash, visible) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(
      target,
      author,
      body,
      new Date().toISOString(),
      clientHash,
      pending ? 0 : 1,
    )
    .run()

  const announcement = notifyComment(env, {
    origin: new URL(request.url).origin,
    target,
    author,
    body,
    pending,
  })
  if (waitUntil) waitUntil(announcement)
  else await announcement

  return json({ comments: await listComments(env, target), pending }, 201)
}
