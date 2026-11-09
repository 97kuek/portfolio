import assert from "node:assert/strict"
import test from "node:test"

import { getUniqueSlugs, slugify } from "../src/lib/string-manipulation.ts"

void test("slugs keep Japanese text and normalize combining characters", () => {
  assert.equal(slugify(" 学習ノート "), "学習ノート")
  assert.equal(slugify("Azure の基礎"), "azure-の基礎")
  assert.equal(slugify("か\u3099くしゅう"), "がくしゅう")
})

void test("normalized tags are unique and cannot create an empty route", () => {
  assert.deepEqual(
    getUniqueSlugs([" 学習 ", "学習", "Azure AI", "azure-ai", "!!!", " "]),
    ["学習", "azure-ai"],
  )
})

void test("existing ASCII slugs keep their spelling", () => {
  assert.equal(slugify(" OpenAI Dots "), "openai-dots")
  assert.equal(slugify("---Cloudflare / Pages---"), "cloudflare-pages")
  assert.equal(slugify("already_a-slug"), "already_a-slug")
})
