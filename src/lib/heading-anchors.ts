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
        // Structural edits are buffered, but guard anyway: wrapping a heading
        // that is already inside its own anchor would nest a second one.
        const parent = ctx.parent(node)
        if (
          parent &&
          parent.type === "element" &&
          parent.tagName === "a" &&
          "dataHeadingAnchor" in parent.properties
        ) {
          return
        }

        const existing = node.properties.id
        const id =
          typeof existing === "string" && existing
            ? existing
            : slugger.slug(ctx.textContent(node))
        if (!id) return
        if (existing !== id) ctx.setProperty(node, "id", id)
        /* The whole heading is the link, rather than a lone "#" beside it:
           a bigger target, and the link takes its accessible name from the
           heading text instead of needing one invented for it. The marker
           itself is drawn in the gutter by CSS. */
        ctx.wrapNode(node, h("a", { dataHeadingAnchor: "", href: `#${id}` }))
      },
    },
  })
}
