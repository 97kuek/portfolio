import { SITE } from "@site-config"
import rss from "@astrojs/rss"
import type { APIContext } from "astro"

export async function GET(context: APIContext) {
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    items: [],
  })
}
