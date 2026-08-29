import { getPostsInLocale } from "@/lib/blog/listing"
import type { Post } from "@/lib/blog/types"
import { localizedPath, type SiteLocale } from "@/lib/i18n"

export type TaxonomyKind = "tag" | "stage"

export interface TaxonomyEntry {
  value: string
  count: number
}

const valuesOf = (post: Post, kind: TaxonomyKind): string[] =>
  kind === "tag" ? post.data.tags : post.data.stage ? [post.data.stage] : []

/** Tags and stages are per-language: each locale lists only its own posts. */
export const getTaxonomyEntries = async (
  locale: SiteLocale,
  kind: TaxonomyKind,
): Promise<TaxonomyEntry[]> => {
  const counts = new Map<string, number>()
  for (const post of await getPostsInLocale(locale)) {
    for (const value of valuesOf(post, kind)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export const getPostsByTaxonomy = async (
  locale: SiteLocale,
  kind: TaxonomyKind,
  value: string,
): Promise<Post[]> =>
  (await getPostsInLocale(locale)).filter((post) =>
    valuesOf(post, kind).includes(value),
  )

export const taxonomyPath = (
  kind: TaxonomyKind,
  value: string,
  locale: SiteLocale,
): string =>
  localizedPath(
    kind === "tag" ? `/blog/tags/${value}` : `/blog/stages/${value}`,
    locale,
  )
