import { PostManager } from "@/lib/blog"
import type { Post, PostMeta } from "@/lib/blog/types"
import { getContentLocale, isContentInLocale } from "@/lib/content-locale"
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

/**
 * Posts to read next: the ones sharing the most tags first, then the most
 * recent. Ordering by tags alone would leave a post with no overlap showing
 * nothing, which on a small blog is most of them.
 */
export const getRelatedPosts = async (
  post: Post,
  limit: number,
): Promise<Post[]> => {
  const tags = new Set(post.data.tags)
  const candidates = (
    await getPostsInLocale(getContentLocale(post.data))
  ).filter((candidate) => candidate.id !== post.id)

  return candidates
    .map((candidate) => ({
      candidate,
      shared: candidate.data.tags.filter((tag) => tags.has(tag)).length,
    }))
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.candidate.data.createdAt.getTime() -
          a.candidate.data.createdAt.getTime(),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}
