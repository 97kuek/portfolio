import { getCollection } from "astro:content"

import { SITE } from "@site-config"

import { getSiteAuthor } from "./author"
import { createBlogDataLoader } from "./data"
import type { Post, PostMeta } from "./types"

export type * from "./types"

const loadBlogData = createBlogDataLoader({
  loadPosts: () => getCollection("blog"),
  loadAuthors: async () => {
    try {
      return await getCollection("people")
    } catch {
      return []
    }
  },
  siteAuthor: getSiteAuthor(),
  locale: SITE.locale.lang,
  cache: import.meta.env.PROD,
})

export async function getAllPostsAndSubposts(): Promise<Post[]> {
  return [...(await loadBlogData()).posts]
}

export async function getMainPosts(): Promise<Post[]> {
  return [...(await loadBlogData()).mainPosts]
}

export async function getMetadata(postId: string): Promise<PostMeta> {
  const metadata = (await loadBlogData()).metadata.get(postId)
  if (!metadata) throw new Error(`Post not found: ${postId}`)
  return metadata
}

export async function getBatchMetadata(
  postIds: string[],
): Promise<Map<string, PostMeta>> {
  if (!postIds.length) return new Map()
  const { metadata } = await loadBlogData()
  return new Map(
    postIds.flatMap((id) => {
      const meta = metadata.get(id)
      return meta ? [[id, meta] as const] : []
    }),
  )
}
