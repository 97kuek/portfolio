import { readFileSync } from "node:fs"
import type { ElementContent } from "hast"
import { toHtml } from "hast-util-to-html"
import { h } from "hastscript"
import { defineMdastPlugin } from "satteri"

const chevron = readFileSync(
  new URL("../assets/icons/callouts/alt-arrow-right.svg", import.meta.url),
  "utf8",
)
  .replace("<svg", '<svg aria-hidden="true"')
  .trim()

/**
 * Plain collapsible block, closed unless `{open}` is given:
 * :::toggle[Summary]
 * Body.
 * :::
 */
export const toggleDirective = defineMdastPlugin({
  name: "toggle-directive",
  containerDirective(node, ctx) {
    if (node.name !== "toggle") return

    const first = node.children[0]
    const isLabel =
      first?.type === "paragraph" &&
      (first.data as { directiveLabel?: boolean })?.directiveLabel === true
    const label = isLabel ? ctx.textContent(first).trim() : ""
    if (!label) throw new Error("Toggles require a summary: :::toggle[Summary]")
    ctx.removeNode(first)

    ctx.prependChild(node, {
      type: "html",
      value: toHtml(
        h("summary", [
          h("span", { dataDisclosureChevron: "" }, [
            { type: "raw", value: chevron } as unknown as ElementContent,
          ]),
          h("span", label),
        ]),
        { allowDangerousHtml: true },
      ),
    })
    ctx.setProperty(node, "data", {
      hName: "details",
      hProperties: {
        dataToggle: "",
        dataDisclosure: "",
        dataDisclosureRotation: "quarter",
        open: !!node.attributes && "open" in node.attributes,
      },
    })
  },
})
