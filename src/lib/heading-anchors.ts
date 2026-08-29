import GithubSlugger from "github-slugger"
import { h } from "hastscript"
import { defineHastPlugin } from "satteri"

export function headingAnchors() {
  const slugger = new GithubSlugger()
  return defineHastPlugin({
    name: "heading-anchors",
    element: {
      filter: ["h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        const existing = node.properties.id
        const id =
          typeof existing === "string" && existing
            ? existing
            : slugger.slug(ctx.textContent(node))
        if (!id) return
        if (existing !== id) ctx.setProperty(node, "id", id)
        // Prepended, not appended: the link reads and renders before the
        // heading text, and CSS lifts it into the gutter so the text itself
        // stays flush with the prose.
        ctx.prependChild(
          node,
          h("a", {
            dataHeadingAnchor: "",
            href: `#${id}`,
            ariaLabel: "Link to this section",
            tabIndex: -1,
          }),
        )
      },
    },
  })
}
