export {
  COMMENT_AUTHOR_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  isValidKind,
  isValidTarget,
  REACTION_KINDS,
  type ReactionKind,
} from "../../src/lib/interactions.ts"

/**
 * Shared plumbing for the interaction endpoints.
 *
 * Cloudflare's own types are not installed: the site is an Astro project and
 * pulling `@cloudflare/workers-types` into its tsconfig would put Worker
 * globals in scope for every browser script too. The handful of D1 members
 * these two routes use are declared here instead.
 */

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

export interface Env {
  DB: D1Database
  /** Set with `wrangler pages secret put INTERACTION_SALT`. */
  INTERACTION_SALT?: string
  /**
   * When "1" or "true", new comments are stored hidden and only appear once
   * someone runs `pnpm comments show <id>`. Off by default: a portfolio with
   * a handful of readers is better served by comments that appear at once.
   */
  COMMENT_MODERATION?: string
  /**
   * Incoming webhook a new comment is announced on. Set with
   * `wrangler pages secret put COMMENT_WEBHOOK_URL`. Without it a comment is
   * stored and nobody is told, which is how this site ran until now.
   */
  COMMENT_WEBHOOK_URL?: string
}

export const isModerated = (env: Env): boolean =>
  env.COMMENT_MODERATION === "1" || env.COMMENT_MODERATION === "true"

export interface RequestContext {
  request: Request
  env: Env
  /**
   * Keeps work alive after the response is sent. A webhook that is slow, or
   * down, must not hold up the reader who wrote the comment.
   */
  waitUntil?: (promise: Promise<unknown>) => void
}

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Interaction state changes as people press buttons, and every response
      // is specific to the caller's own reactions.
      "cache-control": "no-store",
    },
  })

export const error = (message: string, status: number): Response =>
  json({ error: message }, status)

/**
 * Rejects cross-site writes. The pages that call these endpoints are served
 * from the same origin, so a mismatched or missing `Origin` on a write is
 * either a mistake or someone else's page posting on a visitor's behalf.
 */
export const isSameOrigin = (request: Request): boolean => {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

/**
 * A stable pseudonym for one visitor, from the address and user agent
 * Cloudflare already sees. Salted and hashed so the stored value cannot be
 * turned back into an address, and never sent to the browser.
 */
export class InteractionConfigurationError extends Error {
  constructor() {
    super("INTERACTION_SALT is not configured")
    this.name = "InteractionConfigurationError"
  }
}

export const getClientHash = async (
  request: Request,
  env: Env,
): Promise<string> => {
  /* A known fallback would make hashes derived from an address and user agent
     guessable. Interactions are optional, so a misconfigured deployment must
     fail closed instead of weakening the pseudonym. */
  const salt = env.INTERACTION_SALT?.trim()
  if (!salt) throw new InteractionConfigurationError()

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown"
  const agent = request.headers.get("user-agent") ?? "unknown"
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${ip}:${agent}`),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/** Parses a JSON body, returning null rather than throwing on bad input. */
export const readJson = async (
  request: Request,
): Promise<Record<string, unknown> | null> => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return null
  }
  try {
    const body = await request.json()
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Trimmed to keep a long comment from filling the notification. */
const NOTIFICATION_BODY_LIMIT = 500

/**
 * Announces a new comment on the configured webhook.
 *
 * Discord reads `content` and Slack reads `text`, so one payload carrying
 * both reaches either without asking which service the URL belongs to. A
 * failure is swallowed: the comment is already stored, and losing the
 * announcement is not worth failing the write the reader just made.
 */
export const notifyComment = async (
  env: Env,
  {
    origin,
    target,
    author,
    body,
    pending,
  }: {
    origin: string
    target: string
    author: string | null
    body: string
    pending: boolean
  },
): Promise<void> => {
  const url = env.COMMENT_WEBHOOK_URL
  if (!url) return

  const [collection, slug] = target.split(":")
  const link = `${origin}/${collection}/${slug}`
  const trimmed =
    body.length > NOTIFICATION_BODY_LIMIT
      ? `${body.slice(0, NOTIFICATION_BODY_LIMIT)}…`
      : body

  const text = [
    pending ? "New comment (awaiting approval)" : "New comment",
    `${author ?? "Anonymous"} on ${link}`,
    "",
    trimmed,
  ].join("\n")

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text, text }),
    })
  } catch {
    /* The comment stands whether or not the announcement arrives. */
  }
}
