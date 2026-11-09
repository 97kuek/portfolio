import { basename } from "node:path"
import type { APIRoute, GetStaticPaths } from "astro"
import { getCodeStylesAsset } from "../../lib/expressive-code/config.ts"

export const getStaticPaths: GetStaticPaths = async () => {
  const { href, css } = await getCodeStylesAsset()
  return [{ params: { asset: basename(href, ".css") }, props: { css } }]
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.css, {
    headers: { "Content-Type": "text/css; charset=utf-8" },
  })
