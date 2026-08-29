import { PostManager } from "@/lib/blog"
import type { Post, PostMeta } from "@/lib/blog/types"
import { isContentInLocale } from "@/lib/content-locale"
import type { SiteLocale } from "@/lib/i18n"

/** Published posts written in one language, newest first. */
export const getPostsInLocale = async (locale: SiteLocale): Promise<Post[]> =>
  (await PostManager.getInstance().getMainPosts()).filter((post) =>
    isContentInLocale(post.data, locale),
  )

export interface PostWithMeta {
  post: Post
  meta: PostMeta
}

/**
 * Posts paired with their metadata, which is what every listing needs and what
 * each of them was assembling for itself. Entries whose metadata cannot be
 * resolved are dropped rather than rendered half-built.
 */
export const withMetadata = async (posts: Post[]): Promise<PostWithMeta[]> => {
  const metadata = await PostManager.getInstance().getBatchMetadata(
    posts.map((post) => post.id),
  )
  return posts.flatMap((post) => {
    const meta = metadata.get(post.id)
    return meta ? [{ post, meta }] : []
  })
}
