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
}

export interface RequestContext {
  request: Request
  env: Env
}

/** `blog:hello`, `projects:wasa-chat` — collection and shared route slug. */
const TARGET_PATTERN = /^(blog|projects):[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

export const isValidTarget = (target: unknown): target is string =>
  typeof target === "string" && TARGET_PATTERN.test(target)

export const REACTION_KINDS = ["like", "love", "insight", "celebrate"] as const
export type ReactionKind = (typeof REACTION_KINDS)[number]

export const isValidKind = (kind: unknown): kind is ReactionKind =>
  typeof kind === "string" &&
  (REACTION_KINDS as readonly string[]).includes(kind)

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
export const getClientHash = async (
  request: Request,
  env: Env,
): Promise<string> => {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown"
  const agent = request.headers.get("user-agent") ?? "unknown"
  const salt = env.INTERACTION_SALT ?? "97kuek-portfolio"

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
