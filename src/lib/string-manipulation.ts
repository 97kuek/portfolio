/**
 * String manipulation utility functions
 */

/**
 * Converts a string to a URL-friendly slug
 * @param text String to convert to slug
 * @returns Lowercase slug with spaces replaced by dashes
 */
export const slugify = (text: string): string => {
  return text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^\p{L}\p{N}\p{M}_-]+/gu, "")
    .replace(/--+/g, "-") // Replace multiple dashes with single dash
    .replace(/^-+/, "") // Remove leading dashes
    .replace(/-+$/, "") // Remove trailing dashes
}

/** Normalize before deduplicating, and omit values that cannot form a route. */
export const getUniqueSlugs = (values: string[]) => [
  ...new Set(values.map(slugify).filter(Boolean)),
]

/**
 * Deduplicates an array of strings while preserving the case of the first occurrence
 * @param arr Array of strings to deduplicate
 * @returns Array with duplicates removed, preserving case of first occurrence
 */
export const dedupPreserveCase = (arr: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of arr) {
    const lowerCase = item.toLowerCase()
    if (!seen.has(lowerCase)) {
      seen.add(lowerCase)
      result.push(item)
    }
  }

  return result
}
