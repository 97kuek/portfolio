import { DEFAULT_LOCALE, localizedPath, type SiteLocale } from "@/lib/i18n"

/**
 * Bilingual collections keep one file per language, distinguished by a `lang`
 * field and joined by a shared `routeSlug`. Both live in frontmatter rather
 * than in the filename: the glob loader strips punctuation when deriving entry
 * ids, so `post.en.md` and `post.md` would collapse into indistinguishable
 * neighbours.
 */
export interface LocalizedData {
  lang?: SiteLocale
  routeSlug?: string
}

export const getContentLocale = (data: LocalizedData): SiteLocale =>
  data.lang ?? DEFAULT_LOCALE

export const isContentInLocale = (
  data: LocalizedData,
  locale: SiteLocale,
): boolean => getContentLocale(data) === locale

/** Route slug, shared across translations; the entry id is the fallback. */
export const getContentSlug = (id: string, data: LocalizedData): string =>
  data.routeSlug ?? id

/** Permalink for a content entry, localized by the entry's own `lang`. */
export const getContentHref = (
  collection: string,
  id: string,
  data: LocalizedData,
): string => {
  const slug = getContentSlug(id, data)
  return localizedPath(`/${collection}/${slug}`, getContentLocale(data))
}
