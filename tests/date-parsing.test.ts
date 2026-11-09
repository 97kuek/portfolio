import assert from "node:assert/strict"
import test from "node:test"

import { parseDateInput } from "../src/lib/date-parsing.ts"

void test("impossible calendar dates stay invalid instead of rolling over", () => {
  for (const input of [
    "2026-02-30",
    "2026-02-29",
    "2100-02-29",
    "2026-04-31",
    "2026-13",
    "2026-00",
    "2026-01-00",
    "2026-02-30T12:00:00Z",
    "2026-02-30T12:00:00+09:00",
    "2026-01-01T25:00:00",
    "2026-01-01T12:60:00",
    "2026-01-01T12:00:60",
  ]) {
    for (const zone of ["UTC", "Asia/Tokyo"]) {
      assert.ok(Number.isNaN(parseDateInput(input, zone).getTime()), input)
    }
  }
})

void test("calendar dates and times use the configured site timezone", () => {
  const fixtures = [
    ["2026-02", "UTC", "2026-02-01T00:00:00.000Z"],
    ["2026-02-28", "UTC", "2026-02-28T00:00:00.000Z"],
    ["2024-02-29", "UTC", "2024-02-29T00:00:00.000Z"],
    ["2000-02-29", "UTC", "2000-02-29T00:00:00.000Z"],
    ["2026-02", "Asia/Tokyo", "2026-01-31T15:00:00.000Z"],
    [" '2026-02-28' ", "Asia/Tokyo", "2026-02-27T15:00:00.000Z"],
    ["2026-02-28T12:34:56.7", "Asia/Tokyo", "2026-02-28T03:34:56.700Z"],
    ["2026-02-28T12:34:56Z", "Asia/Tokyo", "2026-02-28T12:34:56.000Z"],
    ["2026-02-28T12:34:56+09:00", "UTC", "2026-02-28T03:34:56.000Z"],
  ]
  for (const [input, zone, expected] of fixtures) {
    assert.equal(new Date(parseDateInput(input, zone)).toISOString(), expected)
  }
})

void test("Date objects and numeric timestamps retain their instant", () => {
  const date = new Date("2026-02-28T12:00:00Z")
  assert.equal(parseDateInput(date, "Asia/Tokyo"), date)
  assert.equal(
    parseDateInput(date.getTime(), "Asia/Tokyo").getTime(),
    date.getTime(),
  )
})
