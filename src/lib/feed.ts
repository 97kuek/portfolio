import rss from "@astrojs/rss"
import type { APIContext } from "astro"

import { getSiteDescription } from "@site-config"
import { getDisplayName } from "@/components/profile/helper"
import { PostManager } from "@/lib/blog"
import { getContentHref, isContentInLocale } from "@/lib/content-locale"
import { localizedPath, type SiteLocale } from "@/lib/i18n"

/**
 * One feed per language. A reader who subscribes from the Japanese pages
 * should not start receiving the English translations of the same posts.
 */
export const buildFeed = async (context: APIContext, locale: SiteLocale) => {
  const posts = (await PostManager.getInstance().getMainPosts()).filter(
    (post) => isContentInLocale(post.data, locale),
  )

  return rss({
    title: getDisplayName(locale),
    description: getSiteDescription(locale),
    site: new URL(localizedPath("/", locale), context.site!),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.createdAt,
      categories: post.data.tags,
      link: getContentHref("blog", post.id, post.data),
    })),
  })
}
