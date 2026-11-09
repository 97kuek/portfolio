import type { MarkdownHeading } from "astro"

/**
 * TOC heading item for components.
 * MarkdownHeading has fields depth, slug, text already.
 */
export interface TOCHeadingItem extends MarkdownHeading {
  href: string
}

export interface HeadingRegion {
  id: string
  start: number
  end: number
}
