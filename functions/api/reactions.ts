import {
  error,
  getClientHash,
  InteractionConfigurationError,
  isSameOrigin,
  isValidKind,
  isValidTarget,
  json,
  readJson,
  REACTION_KINDS,
  type Env,
  type RequestContext,
} from "./_lib"

interface CountRow {
  kind: string
  count: number
}

const emptyCounts = (): Record<string, number> =>
  Object.fromEntries(REACTION_KINDS.map((kind) => [kind, 0]))

const clientHashOrResponse = async (
  request: Request,
  env: Env,
): Promise<string | Response> => {
  try {
    return await getClientHash(request, env)
  } catch (cause) {
    if (cause instanceof InteractionConfigurationError) {
      return error("Reactions are temporarily unavailable", 503)
    }
    throw cause
  }
}

/**
 * Every response carries the full tally plus the kinds this visitor has
 * pressed, so the browser never has to guess what its own state is after a
 * toggle — or after arriving with a stale localStorage entry.
 */
const readState = async (env: Env, target: string, clientHash: string) => {
  const [totals, mine] = await Promise.all([
    env.DB.prepare(
      "SELECT kind, COUNT(*) AS count FROM reactions WHERE target = ? GROUP BY kind",
    )
      .bind(target)
      .all<CountRow>(),
    env.DB.prepare(
      "SELECT kind FROM reactions WHERE target = ? AND client_hash = ?",
    )
      .bind(target, clientHash)
      .all<{ kind: string }>(),
  ])

  const counts = emptyCounts()
  for (const row of totals.results) {
    if (row.kind in counts) counts[row.kind] = Number(row.count)
  }

  return { counts, mine: mine.results.map((row) => row.kind) }
}

export const onRequestGet = async ({ request, env }: RequestContext) => {
  const target = new URL(request.url).searchParams.get("target")
  if (!isValidTarget(target)) return error("Invalid target", 400)

  const clientHash = await clientHashOrResponse(request, env)
  if (clientHash instanceof Response) return clientHash
  return json(await readState(env, target, clientHash))
}

export const onRequestPost = async ({ request, env }: RequestContext) => {
  if (!isSameOrigin(request)) return error("Cross-origin request", 403)

  const body = await readJson(request)
  if (!body) return error("Expected a JSON body", 400)

  const { target, kind } = body
  if (!isValidTarget(target)) return error("Invalid target", 400)
  if (!isValidKind(kind)) return error("Unknown reaction", 400)

  const clientHash = await clientHashOrResponse(request, env)
  if (clientHash instanceof Response) return clientHash

  // A press toggles: the primary key makes one reaction per visitor per kind
  // the only representable state, so there is nothing to reconcile.
  const existing = await env.DB.prepare(
    "SELECT 1 FROM reactions WHERE target = ? AND kind = ? AND client_hash = ?",
  )
    .bind(target, kind, clientHash)
    .first()

  if (existing) {
    await env.DB.prepare(
      "DELETE FROM reactions WHERE target = ? AND kind = ? AND client_hash = ?",
    )
      .bind(target, kind, clientHash)
      .run()
  } else {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO reactions (target, kind, client_hash, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(target, kind, clientHash, new Date().toISOString())
      .run()
  }

  return json(await readState(env, target, clientHash))
}
