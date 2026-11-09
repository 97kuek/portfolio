import type { Element } from "hast"
import { h } from "hastscript"
import { defineHastPlugin, type HastFilteredVisitor } from "satteri"
import expressiveCode, { ExpressiveCodeBlock } from "satteri-expressive-code"
import { ecRenderer, getCodeStylesAsset } from "./config.ts"
import { inlineExpressiveCode } from "./inline.ts"

const createBlockPlugin = expressiveCode({
  customCreateRenderer: () => ecRenderer,
  // A fence with no language arrives with an empty one, which matches no key
  // in `overridesByLang`, so an unlabelled block would keep the line numbers
  // meant for real code. Naming it plaintext lets that override apply.
  customCreateBlock: ({ input }) =>
    new ExpressiveCodeBlock({
      ...input,
      language: input.language || "plaintext",
    }),
})

export function blockExpressiveCode() {
  const plugin = createBlockPlugin()
  const visitors = Array.isArray(plugin.element)
    ? plugin.element
    : plugin.element
      ? [plugin.element]
      : []

  return defineHastPlugin({
    ...plugin,
    element: visitors.map<HastFilteredVisitor<Element>>((visitor) => ({
      ...visitor,
      async visit(node, ctx) {
        const rendered = await visitor.visit(node, ctx)
        if (!rendered || !("children" in rendered)) return rendered

        const { href, css } = await getCodeStylesAsset()
        for (const [index, child] of rendered.children.entries()) {
          if (child.type !== "element" || child.tagName !== "style") continue
          const text = child.children[0]
          if (text?.type !== "text" || !text.value.startsWith(css)) continue

          // Replace only the shared prefix, leaving any block-specific CSS in
          // its original cascade position alongside the unchanged scripts.
          const link = h("link", { rel: "stylesheet", href })
          text.value = text.value.slice(css.length)
          rendered.children.splice(index, text.value ? 0 : 1, link)
          break
        }
        return rendered
      },
    })),
  })
}

export { inlineExpressiveCode }
