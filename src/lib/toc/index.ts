import type { MarkdownHeading } from "astro"

import type { TOCHeadingItem } from "./types"

export type { TOCHeadingItem } from "./types"
export { UnifiedTOCController } from "./scroll"

/** Show the table of contents only when it has at least three headings. */
export const MIN_TOC_HEADINGS = 3

/** Filters raw markdown headings to `tocMaxDepth` and adds an in-page `href`. */
export function processRawHeadings(
  headings: MarkdownHeading[],
  tocMaxDepth: number,
): TOCHeadingItem[] {
  if (!headings?.length) return []
  return headings
    .filter((heading) => heading.depth <= tocMaxDepth)
    .map((heading) => ({
      ...heading,
      href: `#${heading.slug}`,
    }))
}
