import type { AuthorData, Post, PostMeta } from "./types"
import { calculateWordCountFromHtml } from "./word-count.ts"

interface BlogData {
  posts: Post[]
  mainPosts: Post[]
  subpostsByParent: Map<string, Post[]>
  metadata: Map<string, PostMeta>
}

interface BlogDataSource {
  loadPosts: () => Promise<Post[]>
  loadAuthors: () => Promise<{ id: string; data: AuthorData }[]>
  siteAuthor: AuthorData
  locale: string
  cache: boolean
}

/** One catalog per build; development deliberately reloads on every request. */
export function createBlogDataLoader(
  source: BlogDataSource,
): () => Promise<BlogData> {
  let cached: Promise<BlogData> | undefined

  async function load(): Promise<BlogData> {
    const [entries, people] = await Promise.all([
      source.loadPosts(),
      source.loadAuthors(),
    ])
    const posts = entries.filter((post) => !post.data.draft)
    const authorsById = new Map(
      people.map((person) => [person.id, person.data]),
    )
    const subpostsByParent = new Map<string, Post[]>()
    const mainPosts: Post[] = []
    const wordCounts = new Map<string, number>()

    for (const post of posts) {
      wordCounts.set(
        post.id,
        calculateWordCountFromHtml(post.rendered?.html, source.locale),
      )
      if (post.id.includes("/")) {
        const parentId = post.id.split("/")[0]
        const siblings = subpostsByParent.get(parentId) ?? []
        siblings.push(post)
        subpostsByParent.set(parentId, siblings)
      } else {
        mainPosts.push(post)
      }
    }
    mainPosts.sort(
      (a, b) => b.data.createdAt.valueOf() - a.data.createdAt.valueOf(),
    )
    for (const siblings of subpostsByParent.values()) {
      siblings.sort(
        (a, b) =>
          a.data.createdAt.valueOf() - b.data.createdAt.valueOf() ||
          (a.data.order ?? 0) - (b.data.order ?? 0),
      )
    }

    const metadata = new Map<string, PostMeta>()
    for (const post of posts) {
      const isSubpost = post.id.includes("/")
      const subposts = isSubpost ? [] : (subpostsByParent.get(post.id) ?? [])
      const authors = (post.data.authors ?? []).flatMap((reference) => {
        const author = authorsById.get(reference.id)
        return author ? [author] : []
      })
      const wordCount = wordCounts.get(post.id) ?? 0
      metadata.set(post.id, {
        ...post.data,
        id: post.id,
        wordCount,
        combinedWordCount: subposts.length
          ? wordCount +
            subposts.reduce(
              (sum, child) => sum + (wordCounts.get(child.id) ?? 0),
              0,
            )
          : null,
        subpostCount: subposts.length,
        hasSubposts: subposts.length > 0,
        isSubpost,
        authors: authors.length ? authors : [source.siteAuthor],
      })
    }
    return { posts, mainPosts, subpostsByParent, metadata }
  }

  return () => {
    if (!source.cache) return load()
    cached ??= load()
    return cached
  }
}
