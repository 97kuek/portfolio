import { readFile } from "node:fs/promises"
import type { Loader } from "astro/loaders"
import { parse } from "yaml"

/** Preserve YAML date scalars until the collection schema validates them. */
export function preserveFrontmatterDates(
  loader: Loader,
  fields: string[],
): Loader {
  return {
    ...loader,
    async load(context) {
      await loader.load({
        ...context,
        async parseData(entry) {
          const dateFields = fields.filter(
            (field) => entry.data[field] instanceof Date,
          )
          if (!entry.filePath || dateFields.length === 0) {
            return context.parseData(entry)
          }

          const source = await readFile(entry.filePath, "utf8")
          const frontmatter = source.match(
            /(?:^\uFEFF?|^\s*\n)---([\s\S]*?\n)---/,
          )
          if (!frontmatter) return context.parseData(entry)

          // YAML 1.2 core schema leaves date-looking scalars as strings.
          const raw = parse(frontmatter[1], {
            schema: "core",
            merge: true,
          }) as Record<string, unknown>
          const data = { ...entry.data }
          for (const field of dateFields) {
            Object.assign(data, { [field]: raw[field] })
          }
          return context.parseData({ ...entry, data })
        },
      })
    },
  }
}
