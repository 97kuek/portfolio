import { getCollection } from "astro:content"

import { SITE } from "@site-config"
import { getContentSlug } from "@/lib/content-locale"
import {
  DEFAULT_LOCALE,
  getSiteLocale,
  localizedPath,
  normalizePath,
  translatedPathFromAvailable,
  type SiteLocale,
} from "@/lib/i18n"
import { getTaxonomyEntries } from "@/lib/blog/taxonomy"
import { getPostsInLocale } from "@/lib/blog/listing"

const TRANSLATED_STATIC_PATHS = [
  "/",
  "/projects",
  "/experience",
  "/blog",
  "/blog/tags",
  "/search",
  "/privacy",
] as const

const addLocalePath = (paths: Set<string>, path: string, locale: SiteLocale) =>
  paths.add(normalizePath(localizedPath(path, locale)))

const collectAvailablePaths = async (): Promise<Set<string>> => {
  const paths = new Set<string>()

  for (const path of TRANSLATED_STATIC_PATHS) {
    addLocalePath(paths, path, "ja")
    addLocalePath(paths, path, "en")
  }

  const [posts, projects] = await Promise.all([
    getCollection("blog", (post) => !post.data.draft),
    getCollection("projects", (project) => !!project.body?.trim()),
  ])

  for (const post of posts) {
    addLocalePath(
      paths,
      `/blog/${getContentSlug(post.id, post.data)}`,
      post.data.lang,
    )
  }

  for (const project of projects) {
    addLocalePath(
      paths,
      `/projects/${getContentSlug(project.id, project.data)}`,
      project.data.lang,
    )
  }

  for (const locale of ["ja", "en"] as const) {
    const localePosts = await getPostsInLocale(locale)
    const totalPages = Math.ceil(localePosts.length / SITE.blog.postsPerPage)
    for (let page = 2; page <= totalPages; page += 1) {
      addLocalePath(paths, `/blog/page/${page}`, locale)
    }

    for (const { value } of await getTaxonomyEntries(locale, "tag")) {
      addLocalePath(paths, `/blog/tags/${value}`, locale)
    }
    for (const { value } of await getTaxonomyEntries(locale, "stage")) {
      addLocalePath(paths, `/blog/stages/${value}`, locale)
    }
  }

  return paths
}

let availablePathsPromise: Promise<Set<string>> | undefined

const getAvailablePaths = () => {
  availablePathsPromise ??= collectAvailablePaths()
  return availablePathsPromise
}

export const getTranslatedPath = async (
  pathname: string,
): Promise<string | null> =>
  translatedPathFromAvailable(pathname, await getAvailablePaths())

/** A switch stays useful on an untranslated route by returning to that locale's home. */
export const getLanguageSwitchPath = async (
  pathname: string,
): Promise<string> => {
  const translated = await getTranslatedPath(pathname)
  if (translated) return translated
  return getSiteLocale(pathname) === DEFAULT_LOCALE
    ? localizedPath("/", "en")
    : localizedPath("/", DEFAULT_LOCALE)
}
