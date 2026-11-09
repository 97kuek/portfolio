import {
  COMMENT_AUTHOR_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  error,
  getClientHash,
  InteractionConfigurationError,
  isSameOrigin,
  isModerated,
  isValidTarget,
  json,
  notifyComment,
  readJson,
  type Env,
  type RequestContext,
} from "./_lib.ts"
import type {
  CommentPage,
  CommentPostResponse,
  PublicComment,
} from "../../src/lib/interactions.ts"

interface CommentRow {
  id: number
  author: string | null
  body: string
  created_at: string
}

const MAX_PER_HOUR = 5
const PAGE_SIZE = 200

const serialize = (row: CommentRow): PublicComment => ({
  id: row.id,
  author: row.author,
  body: row.body,
  createdAt: row.created_at,
})

const listComments = async (
  env: Env,
  target: string,
  before: number | null,
): Promise<CommentPage> => {
  const { results } = await env.DB.prepare(
    `SELECT id, author, body, created_at FROM comments WHERE target = ? AND visible = 1${before === null ? "" : " AND id < ?"} ORDER BY id DESC LIMIT ?`,
  )
    .bind(target, ...(before === null ? [] : [before]), PAGE_SIZE + 1)
    .all<CommentRow>()
  const comments = results.slice(0, PAGE_SIZE).reverse().map(serialize)
  return {
    comments,
    nextCursor: results.length > PAGE_SIZE ? comments[0].id : null,
  }
}

export const onRequestGet = async ({ request, env }: RequestContext) => {
  const params = new URL(request.url).searchParams
  const target = params.get("target")
  if (!isValidTarget(target)) return error("Invalid target", 400)

  const rawBefore = params.get("before")
  const before = rawBefore === null ? null : Number(rawBefore)
  if (
    rawBefore !== null &&
    (!/^[1-9]\d*$/.test(rawBefore) || !Number.isSafeInteger(before))
  ) {
    return error("Invalid cursor", 400)
  }
  return json(await listComments(env, target, before))
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

  let clientHash: string
  try {
    clientHash = await getClientHash(request, env)
  } catch (cause) {
    if (cause instanceof InteractionConfigurationError) {
      return error("Comments are temporarily unavailable", 503)
    }
    throw cause
  }
  const now = new Date()
  const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const pending = isModerated(env)
  // D1 executes this as one statement: concurrent posts cannot pass a stale
  // count check before writing. Hidden comments count toward the limit too.
  const inserted = await env.DB.prepare(
    `INSERT INTO comments (target, author, body, created_at, client_hash, visible)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM comments WHERE client_hash = ? AND created_at > ?) < ?
     RETURNING id, author, body, created_at`,
  )
    .bind(
      target,
      author,
      body,
      now.toISOString(),
      clientHash,
      pending ? 0 : 1,
      clientHash,
      anHourAgo,
      MAX_PER_HOUR,
    )
    .first<CommentRow>()

  if (!inserted) return error("Too many comments in a short time", 429)

  const announcement = notifyComment(env, {
    origin: new URL(request.url).origin,
    target,
    author,
    body,
    pending,
  })
  if (waitUntil) waitUntil(announcement)
  else await announcement

  const result: CommentPostResponse = {
    ...(await listComments(env, target, null)),
    pending,
  }
  return json(result, 201)
}
