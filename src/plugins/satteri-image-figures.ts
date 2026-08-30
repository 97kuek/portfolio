import { h } from "hastscript"
import { defineHastPlugin } from "satteri"

/**
 * Gives every captioned image a caption under it.
 *
 * A Markdown image on its own line comes out as a paragraph holding nothing
 * but the image, which leaves its alt text invisible. Wrapping it in a figure
 * puts that text under the picture, where a reader can use it too.
 *
 * The alt attribute is emptied as the caption takes over: `figure` already
 * associates the two, so leaving both would have a screen reader announce the
 * same sentence twice. An image with no alt text is left alone — a caption has
 * to be written, not invented.
 */
export function imageFigures() {
  return defineHastPlugin({
    name: "image-figures",
    element: {
      filter: ["p"],
      visit(node, ctx) {
        const children = node.children.filter(
          (child) =>
            !(child.type === "text" && child.value.trim().length === 0),
        )
        if (children.length !== 1) return

        const image = children[0]
        if (image.type !== "element" || image.tagName !== "img") return

        const alt = image.properties.alt
        if (typeof alt !== "string" || alt.trim().length === 0) return

        ctx.replaceNode(
          node,
          h("figure", [
            h("img", { ...image.properties, alt: "" }),
            h("figcaption", alt),
          ]),
        )
      },
    },
  })
}
