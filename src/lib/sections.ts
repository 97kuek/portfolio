import { localizedPath, type SiteLocale } from "@/lib/i18n"

/**
 * The site's top-level destinations. Their names and icons were repeated in
 * every page component that renders a heading or a breadcrumb for them, once
 * per language; this is the one place they are written down.
 */
export const SECTIONS = {
  projects: {
    path: "/projects",
    icon: "folder-open",
    label: { en: "Projects", ja: "プロジェクト" },
  },
  experience: {
    path: "/experience",
    icon: "timeline",
    label: { en: "Experience", ja: "経歴" },
  },
  blog: {
    path: "/blog",
    icon: "blog",
    label: { en: "Blog", ja: "ブログ" },
  },
  tags: {
    path: "/blog/tags",
    icon: "tags",
    label: { en: "Tags", ja: "タグ" },
  },
} as const satisfies Record<
  string,
  { path: string; icon: string; label: Record<SiteLocale, string> }
>

export type SectionKey = keyof typeof SECTIONS

export const sectionLabel = (key: SectionKey, locale: SiteLocale): string =>
  SECTIONS[key].label[locale]

export const sectionPath = (key: SectionKey, locale: SiteLocale): string =>
  localizedPath(SECTIONS[key].path, locale)

/**
 * A breadcrumb entry for a section. The last crumb on a page is the page
 * itself, so `current` drops the link.
 */
export const sectionCrumb = (
  key: SectionKey,
  locale: SiteLocale,
  { current = false }: { current?: boolean } = {},
) => ({
  label: sectionLabel(key, locale),
  icon: SECTIONS[key].icon,
  ...(current ? {} : { href: sectionPath(key, locale) }),
})

/** Nav label for a configured link, falling back to the configured text. */
export const navLabel = (
  href: string,
  fallback: string,
  locale: SiteLocale,
): string => {
  const section = Object.values(SECTIONS).find((entry) => entry.path === href)
  return section ? section.label[locale] : fallback
}
