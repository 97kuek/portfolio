import { toHtml } from "hast-util-to-html"
import { h } from "hastscript"
import { defineMdastPlugin } from "satteri"

/** Reusable Markdown embed: ::youtube[Video title]{id="VIDEO_ID"} */
export const youtubeEmbed = defineMdastPlugin({
  name: "youtube-embed",
  leafDirective(node, ctx) {
    if (node.name !== "youtube") return

    const id = node.attributes?.id ?? ""
    const title = ctx.textContent(node).trim()
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !title) {
      throw new Error(
        "YouTube embeds require an 11-character video id and a title",
      )
    }

    ctx.replaceNode(node, {
      type: "html",
      value: toHtml(
        h("figure", { className: "video-embed" }, [
          h("iframe", {
            src: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1`,
            title,
            width: 560,
            height: 315,
            loading: "lazy",
            referrerPolicy: "strict-origin-when-cross-origin",
            allow: "encrypted-media; picture-in-picture; fullscreen",
            allowFullScreen: true,
          }),
          h("figcaption", title),
        ]),
      ),
    })
  },
})
