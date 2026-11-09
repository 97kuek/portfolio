import type { CollectionEntry, InferEntrySchema } from "astro:content"

export type Post = CollectionEntry<"blog">

export type AuthorData = InferEntrySchema<"people">

/**
 * Post metadata with computed fields.
 * Extends the base post data with calculated information
 * like word counts and subpost relationships.
 */
export interface PostMeta extends Omit<InferEntrySchema<"blog">, "authors"> {
  id: string
  wordCount: number
  combinedWordCount: number | null
  isSubpost: boolean
  subpostCount: number
  hasSubposts: boolean
  authors: AuthorData[]
}
