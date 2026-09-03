export type SiteLocale = "ja" | "en"

/** Japanese is the site's default language and owns the unprefixed routes. */
export const DEFAULT_LOCALE: SiteLocale = "ja"
const PREFIXED_LOCALE: SiteLocale = "en"
const LOCALE_PREFIX = "/en"

/** BCP 47 tags for Intl formatting and the `lang` attribute. */
const LOCALE_TAGS: Record<SiteLocale, string> = {
  en: "en-US",
  ja: "ja-JP",
}

export const getSiteLocale = (pathname: string): SiteLocale =>
  pathname === LOCALE_PREFIX || pathname.startsWith(`${LOCALE_PREFIX}/`)
    ? PREFIXED_LOCALE
    : DEFAULT_LOCALE

export const getLocaleTag = (locale: SiteLocale): string => LOCALE_TAGS[locale]

export const localizedPath = (href: string, locale: SiteLocale) => {
  if (locale === DEFAULT_LOCALE) return href
  return href === "/" ? LOCALE_PREFIX : `${LOCALE_PREFIX}${href}`
}

/** Path with the locale prefix removed, whatever locale it came in as. */
export const stripLocalePrefix = (pathname: string) =>
  pathname.replace(/^\/en(?=\/|$)/, "") || "/"

const normalizePath = (pathname: string): string => {
  if (pathname === "/") return pathname
  return pathname.replace(/\/+$/, "") || "/"
}

/** Resolve the other locale only when that exact generated route exists. */
export const translatedPathFromAvailable = (
  pathname: string,
  availablePaths: ReadonlySet<string>,
): string | null => {
  const normalized = normalizePath(pathname)
  const currentLocale = getSiteLocale(normalized)
  const targetLocale: SiteLocale =
    currentLocale === DEFAULT_LOCALE ? "en" : DEFAULT_LOCALE
  const candidate = normalizePath(
    localizedPath(stripLocalePrefix(normalized), targetLocale),
  )
  return availablePaths.has(candidate) ? candidate : null
}
