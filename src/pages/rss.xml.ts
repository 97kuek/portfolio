import { SITE } from "@site-config"
import rss from "@astrojs/rss"
import type { APIContext } from "astro"

import { PostManager } from "@/lib/blog"
import { getContentHref, isContentInLocale } from "@/lib/content-locale"

export async function GET(context: APIContext) {
  const posts = (await PostManager.getInstance().getMainPosts()).filter(
    (post) => isContentInLocale(post.data, "en"),
  )

  return rss({
    title: SITE.title,
    description: SITE.description,
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
