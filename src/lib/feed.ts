import rss from "@astrojs/rss"
import type { APIContext } from "astro"

import { SITE } from "@site-config"
import { PostManager } from "@/lib/blog"
import { getContentHref, isContentInLocale } from "@/lib/content-locale"
import type { SiteLocale } from "@/lib/i18n"

/**
 * One feed per language. A reader who subscribes from the Japanese pages
 * should not start receiving the English translations of the same posts.
 */
export const buildFeed = async (context: APIContext, locale: SiteLocale) => {
  const posts = (await PostManager.getInstance().getMainPosts()).filter(
    (post) => isContentInLocale(post.data, locale),
  )

  return rss({
    title: SITE.title,
    description:
      locale === "en"
        ? SITE.description
        : "早稲田大学で情報通信を学ぶAIエンジニア、植木敬太郎のポートフォリオ。",
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.createdAt,
      categories: post.data.tags,
      link: getContentHref("blog", post.id, post.data),
    })),
  })
}
