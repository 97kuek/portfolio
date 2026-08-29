#!/usr/bin/env node
/**
 * Rebuilds the Japanese fonts the social-card renderer draws with.
 *
 * The full Noto Sans JP is ~4.5MB per weight, which is a lot to keep in a
 * repository for something only the build reads. This cuts it down to kana,
 * punctuation, Latin and the most common kanji — enough for any title this
 * site is likely to carry, at about a fifth of the size.
 *
 * Only needed when a title uses a character outside the subset (it renders
 * blank in the card, never on the page):
 *
 *   node scripts/subset-og-font.mjs
 *
 * Requires network access and installs nothing permanently:
 * `npx --yes subset-font` provides the subsetter.
 */
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const KANJI_COUNT = 3000
const SOURCES = [
  {
    url: "https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/JP/NotoSansJP-Regular.otf",
    out: "NotoSansJP-Regular-subset.ttf",
  },
  {
    url: "https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/JP/NotoSansJP-Bold.otf",
    out: "NotoSansJP-Bold-subset.ttf",
  },
]
const FREQUENCY_LIST =
  "https://raw.githubusercontent.com/scriptin/topokanji/master/data/kanji-frequency/wikipedia.json"

/** Ranges every Japanese title needs regardless of which kanji it uses. */
const RANGES = [
  [0x20, 0x7e], // ASCII printable
  [0xa0, 0xff], // Latin-1 supplement
  [0x2000, 0x206f], // general punctuation
  [0x3000, 0x303f], // CJK punctuation
  [0x3040, 0x30ff], // hiragana and katakana
  [0x31f0, 0x31ff], // katakana phonetic extensions
  [0xff01, 0xff60], // fullwidth forms
  [0xffe0, 0xffe6],
]
const EXTRA_MARKS = "…—–※〜№℃±×÷→←↑↓★☆♪"

const fetchOrFail = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} from ${url}`)
  return response
}

const outputDir = fileURLToPath(new URL("../src/assets/og/", import.meta.url))

const frequencies = await (await fetchOrFail(FREQUENCY_LIST)).json()
const kanji = frequencies
  .filter(([character]) => /^[㐀-鿿]$/.test(character))
  .slice(0, KANJI_COUNT)
  .map(([character]) => character)

const characters = new Set(kanji)
for (const [start, end] of RANGES) {
  for (let code = start; code <= end; code += 1) {
    characters.add(String.fromCodePoint(code))
  }
}
for (const mark of EXTRA_MARKS) characters.add(mark)

const { default: subsetFont } = await import("subset-font")
const text = [...characters].join("")
for (const { url, out } of SOURCES) {
  const source = Buffer.from(await (await fetchOrFail(url)).arrayBuffer())
  const subset = await subsetFont(source, text, { targetFormat: "truetype" })
  await writeFile(join(outputDir, out), subset)
  console.log(`${out}: ${Math.round(subset.length / 1024)}KB`)
}

console.log(`${characters.size} characters kept`)
