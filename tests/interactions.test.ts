import assert from "node:assert/strict"
import test from "node:test"

import {
  getClientHash,
  InteractionConfigurationError,
  isSameOrigin,
} from "../functions/api/_lib.ts"

const request = (origin?: string) =>
  new Request("https://portfolio.example/api/reactions", {
    headers: {
      ...(origin ? { origin } : {}),
      "cf-connecting-ip": "192.0.2.10",
      "user-agent": "portfolio-test",
    },
  })

void test("interaction hashing fails closed when its secret is absent", async () => {
  await assert.rejects(
    getClientHash(request(), { DB: {} as never }),
    InteractionConfigurationError,
  )
  await assert.rejects(
    getClientHash(request(), { DB: {} as never, INTERACTION_SALT: "   " }),
    InteractionConfigurationError,
  )
})

void test("interaction hashes are stable per secret and change after rotation", async () => {
  const first = await getClientHash(request(), {
    DB: {} as never,
    INTERACTION_SALT: "first-secret",
  })
  const repeated = await getClientHash(request(), {
    DB: {} as never,
    INTERACTION_SALT: "first-secret",
  })
  const rotated = await getClientHash(request(), {
    DB: {} as never,
    INTERACTION_SALT: "second-secret",
  })

  assert.equal(first, repeated)
  assert.notEqual(first, rotated)
  assert.match(first, /^[a-f0-9]{64}$/)
})

void test("same-origin writes require a matching Origin header", () => {
  assert.equal(isSameOrigin(request("https://portfolio.example")), true)
  assert.equal(isSameOrigin(request("https://attacker.example")), false)
  assert.equal(isSameOrigin(request()), false)
})
