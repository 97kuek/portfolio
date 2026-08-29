export type SiteLocale = "ja" | "en"

/** English is the site's default language and owns the unprefixed routes. */
export const DEFAULT_LOCALE: SiteLocale = "en"
const PREFIXED_LOCALE: SiteLocale = "ja"
const LOCALE_PREFIX = "/ja"

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

/** Path with the `/ja` prefix removed, whatever locale it came in as. */
const stripPrefix = (pathname: string) =>
  pathname.replace(/^\/ja(?=\/|$)/, "") || "/"

/**
 * Whether both languages actually build this page. The palette preview and
 * 404 exist only once, so they get a language switch to the home page and no
 * `hreflang` pair claiming a translation that is not there.
 */
export const hasTranslation = (pathname: string): boolean => {
  const path = stripPrefix(pathname)
  return (
    ["/", "/projects", "/experience", "/blog"].includes(path) ||
    /^\/(projects|blog)\/[^/]+$/.test(path)
  )
}

export const alternateLanguagePath = (pathname: string) => {
  if (getSiteLocale(pathname) === PREFIXED_LOCALE) return stripPrefix(pathname)
  return hasTranslation(pathname)
    ? localizedPath(pathname, PREFIXED_LOCALE)
    : LOCALE_PREFIX
}

const japaneseNavLabels: Record<string, string> = {
  "/projects": "プロジェクト",
  "/experience": "経歴",
  "/blog": "ブログ",
}

export const navLabel = (href: string, label: string, locale: SiteLocale) =>
  locale === "en" ? label : (japaneseNavLabels[href] ?? label)
