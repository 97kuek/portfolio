import type { RootContent, Text } from "mdast"
import { defineMdastPlugin } from "satteri"

/**
 * Drops the space a wrapped source line introduces between Japanese characters.
 *
 * Markdown treats a newline inside a paragraph as a space, which is right for
 * languages that separate words with one. Japanese does not: a paragraph
 * wrapped at 80 columns comes out with a gap at every wrap point, so the text
 * reads as unevenly spaced and the lines look pushed around. The newline is
 * removed only between two CJK characters, so a wrapped English sentence, and
 * a Japanese line that wraps next to Latin text, both keep their space.
 */
const CJK =
  "\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uff9f\\u3000-\\u303f"
const CJK_TEST = new RegExp(`[${CJK}]`)
const BETWEEN = new RegExp(`([${CJK}])\\n[ \\t]*([${CJK}])`, "g")
const TRAILING = new RegExp(`([${CJK}])\\n[ \\t]*$`)
const LEADING = new RegExp(`^\\n[ \\t]*(?=[${CJK}])`)

const isCjk = (character: string | undefined): boolean =>
  !!character && CJK_TEST.test(character)

/** First and last rendered characters of a sibling, across inline wrappers. */
const edgeCharacter = (
  node: RootContent | undefined,
  edge: "first" | "last",
): string | undefined => {
  if (!node) return undefined
  if ("value" in node && typeof node.value === "string") {
    return edge === "first" ? node.value[0] : node.value.at(-1)
  }
  if ("children" in node && Array.isArray(node.children)) {
    const child = edge === "first" ? node.children[0] : node.children.at(-1)
    return edgeCharacter(child as RootContent | undefined, edge)
  }
  return undefined
}

export function collapseCjkLineBreaks() {
  return defineMdastPlugin({
    name: "collapse-cjk-line-breaks",
    text(node: Text, ctx) {
      let value = node.value.replace(BETWEEN, "$1$2")

      // A newline can also sit at a text node's edge, with the character on
      // the other side belonging to a neighbouring `strong`, link or the like.
      const parent = ctx.parent(node)
      const index = ctx.indexOf(node)
      if (parent && "children" in parent && index !== undefined) {
        const siblings = parent.children as RootContent[]
        if (
          TRAILING.test(value) &&
          isCjk(edgeCharacter(siblings[index + 1], "first"))
        ) {
          value = value.replace(TRAILING, "$1")
        }
        if (
          LEADING.test(value) &&
          isCjk(edgeCharacter(siblings[index - 1], "last"))
        ) {
          value = value.replace(LEADING, "")
        }
      }

      if (value !== node.value) ctx.setProperty(node, "value", value)
    },
  })
}
