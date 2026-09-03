import type { APIRoute, GetStaticPaths } from "astro"

import { renderPostImage } from "@/lib/og"
import { getProjects } from "@/lib/projects"

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getProjects()
  return projects.map((project) => ({
    params: { id: project.id },
    props: {
      title: project.data.title,
      description: project.data.description,
      image: project.data.image,
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
