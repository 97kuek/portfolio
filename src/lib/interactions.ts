/**
 * The contract the interaction widgets and their API share.
 *
 * Both sides need the same reaction names and the same idea of what a valid
 * target looks like, and they are built separately — the pages by Astro, the
 * endpoints by wrangler — so this module is deliberately plain TypeScript with
 * no imports, and `functions/api/_lib.ts` reaches it by relative path.
 */

export const REACTION_KINDS = ["like", "love", "insight", "celebrate"] as const

export type ReactionKind = (typeof REACTION_KINDS)[number]

/** Collections whose entries can be reacted to and commented on. */
export const INTERACTIVE_COLLECTIONS = ["blog", "projects"] as const

export type InteractiveCollection = (typeof INTERACTIVE_COLLECTIONS)[number]

/**
 * `blog:hello`, `projects:wasa-chat` — the collection and the shared route
 * slug, so a page and its translation address the same thread.
 */
export const interactionTarget = (
  collection: InteractiveCollection,
  slug: string,
): string => `${collection}:${slug}`

const TARGET_PATTERN =
  /^(?:blog|projects):[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

export const isValidTarget = (target: unknown): target is string =>
  typeof target === "string" && TARGET_PATTERN.test(target)

export const isValidKind = (kind: unknown): kind is ReactionKind =>
  typeof kind === "string" &&
  (REACTION_KINDS as readonly string[]).includes(kind)

/** Endpoints, so the widgets and the routes cannot disagree about the path. */
export const REACTIONS_ENDPOINT = "/api/reactions"
export const COMMENTS_ENDPOINT = "/api/comments"

/**
 * Comment limits. The form enforces them so a writer sees the cap while
 * typing; the endpoint enforces them because a form is not a boundary.
 */
export const COMMENT_MAX_LENGTH = 2000
export const COMMENT_AUTHOR_MAX_LENGTH = 40
