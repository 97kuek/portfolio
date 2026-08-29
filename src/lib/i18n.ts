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

export const alternateLanguagePath = (pathname: string) => {
  if (getSiteLocale(pathname) === PREFIXED_LOCALE) {
    const defaultPath = pathname.replace(/^\/ja(?=\/|$)/, "")
    return defaultPath || "/"
  }

  // Only paths that actually have a Japanese build are worth linking to; the
  // rest (the palette preview, 404) fall back to the Japanese home page.
  const isTranslated =
    ["/", "/projects", "/experience", "/blog"].includes(pathname) ||
    /^\/(projects|blog)\/[^/]+$/.test(pathname)
  return isTranslated ? localizedPath(pathname, PREFIXED_LOCALE) : LOCALE_PREFIX
}

const japaneseNavLabels: Record<string, string> = {
  "/projects": "プロジェクト",
  "/experience": "経歴",
  "/blog": "ブログ",
}

export const navLabel = (href: string, label: string, locale: SiteLocale) =>
  locale === "en" ? label : (japaneseNavLabels[href] ?? label)
