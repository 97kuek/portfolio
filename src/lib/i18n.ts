export type SiteLocale = "ja" | "en"

export const getSiteLocale = (pathname: string): SiteLocale =>
  pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ja"

export const localizedPath = (href: string, locale: SiteLocale) => {
  if (locale === "ja") return href
  return href === "/" ? "/en" : `/en${href}`
}

export const alternateLanguagePath = (pathname: string) => {
  const locale = getSiteLocale(pathname)
  if (locale === "en") {
    const japanesePath = pathname.replace(/^\/en(?=\/|$)/, "")
    return japanesePath || "/"
  }

  // Only paths that actually have an English build are worth linking to; the
  // rest (the palette preview, 404) fall back to the English home page.
  const isTranslated =
    ["/", "/projects", "/experience", "/blog"].includes(pathname) ||
    /^\/(projects|blog)\/[^/]+$/.test(pathname)
  const supportedPath = isTranslated ? pathname : "/"
  return supportedPath === "/" ? "/en" : `/en${supportedPath}`
}

const japaneseNavLabels: Record<string, string> = {
  "/projects": "プロジェクト",
  "/experience": "経歴",
  "/blog": "ブログ",
}

export const navLabel = (href: string, label: string, locale: SiteLocale) =>
  locale === "en" ? label : (japaneseNavLabels[href] ?? label)
