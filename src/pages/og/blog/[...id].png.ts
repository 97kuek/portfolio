import type { APIRoute, GetStaticPaths } from "astro"

import { PostManager } from "@/lib/blog"
import { renderPostImage } from "@/lib/og"

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await PostManager.getInstance().getAllPostsAndSubposts()
  return posts.map((post) => ({
    params: { id: post.id },
    props: {
      title: post.data.title,
      description: post.data.description,
      image: post.data.image,
    },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderPostImage(
    props as {
      title: string
      description?: string
      image?: { fsPath?: string }
    },
  )
  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png" },
  })
}
