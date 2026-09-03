import assert from "node:assert/strict"
import test from "node:test"

import {
  getSiteLocale,
  localizedPath,
  stripLocalePrefix,
  translatedPathFromAvailable,
} from "../src/lib/i18n.ts"

const availablePaths = new Set([
  "/",
  "/en",
  "/blog/hello",
  "/en/blog/hello",
  "/blog/tags/astro",
  "/en/blog/tags/astro",
  "/projects/japanese-only",
])

void test("locale helpers handle the default and prefixed routes", () => {
  assert.equal(getSiteLocale("/"), "ja")
  assert.equal(getSiteLocale("/en/projects"), "en")
  assert.equal(stripLocalePrefix("/en/blog/hello"), "/blog/hello")
  assert.equal(localizedPath("/projects", "en"), "/en/projects")
})

void test("translation lookup returns only an exact generated counterpart", () => {
  assert.equal(
    translatedPathFromAvailable("/blog/hello", availablePaths),
    "/en/blog/hello",
  )
  assert.equal(
    translatedPathFromAvailable("/en/blog/hello/", availablePaths),
    "/blog/hello",
  )
  assert.equal(
    translatedPathFromAvailable("/blog/tags/astro", availablePaths),
    "/en/blog/tags/astro",
  )
  assert.equal(
    translatedPathFromAvailable("/projects/japanese-only", availablePaths),
    null,
  )
})
