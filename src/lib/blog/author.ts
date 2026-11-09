import type { SiteLocale } from "@/lib/i18n"

import { PROFILE, SITE } from "@site-config"

import type { AuthorData } from "./types"

/**
 * Build an AuthorData object from site config as a fallback
 * when no authors are defined or people.toml is missing/empty.
 */
export function getSiteAuthor(): AuthorData {
  return {
    id: PROFILE.name.toLowerCase().replace(/\s+/g, "-"),
    name: SITE.author,
    pronouns: PROFILE.pronouns,
    avatar: undefined,
    bio: SITE.description,
    affiliation: undefined,
    links: PROFILE.links ?? {},
  }
}

/** Author name in the language of the page, mirroring the profile's rule. */
export const getAuthorName = (
  author: { name: string; nameJa?: string },
  locale: SiteLocale,
): string => (locale === "en" ? author.name : author.nameJa || author.name)
