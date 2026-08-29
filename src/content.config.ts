import { defineCollection, reference } from "astro:content"
import { file, glob } from "astro/loaders"
import { z } from "astro/zod"

import { ProfileLinkConfigSchema, ProjectTypeSchema } from "@/schemas"

import { createLocalDate } from "@/lib/date-utils"
import {
  dedupLowerCase,
  dedupPreserveCase,
  slugify,
} from "@/lib/string-manipulation"

const yearMonthDateSchema = z
  .union([z.date(), z.string().transform(createLocalDate)])
  .describe("Should be valid YYYY-MM format.")

const dateSchema = z
  .union([z.date(), z.string().transform(createLocalDate)])
  .refine((date) => !Number.isNaN(date.getTime()), {
    error: "Invalid date format. Must be YYYY-MM-DD or ISO datetime format.",
  })

/**
 * Bilingual collections keep one file per language. The language and the
 * shared route slug are declared in frontmatter rather than encoded in the
 * filename, because the glob loader strips punctuation when it derives ids.
 */
const localeFields = {
  lang: z.enum(["ja", "en"]).default("ja"),
  routeSlug: z
    .string()
    .optional()
    .describe(
      "Route slug shared by every translation. Deliberately not named `slug`: the glob loader treats that key as an id override and would collapse translations into one entry.",
    ),
}

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z
      .object({
        ...localeFields,
        title: z.string(),
        description: z.string().max(200).optional(),
        createdAt: dateSchema,
        updatedAt: dateSchema.optional(),
        order: z.number().optional(),
        image: image().optional(),
        tags: z
          .array(z.string())
          .default([])
          .transform((arr) => dedupLowerCase(arr).map((tag) => slugify(tag))),
        authors: z.array(reference("people")).default([]),
        draft: z.boolean().default(false),
        stage: z.enum(["seedling", "budding", "evergreen"]).optional(),
        audience: z.string().max(300).optional(),
      })
      .refine(
        (data) =>
          !data.createdAt || !data.updatedAt || data.updatedAt > data.createdAt,
        {
          error: "Modified date must be after published date",
        },
      ),
})

const people = defineCollection({
  loader: file("./src/content/people.toml"),
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      name: z.string(),
      /** Japanese form of the name, shown on the Japanese pages. */
      nameJa: z.string().optional(),
      pronouns: z.string().optional(),
      avatar: z
        .union([z.url(), z.string().startsWith("/"), image()])
        .optional()
        .describe(
          "Avatar URL, /public path, or path to a local image relative to src/content/ (optimized at build).",
        ),
      bio: z.string().max(200).optional(),
      affiliation: z.string().max(100).optional(),
      links: ProfileLinkConfigSchema,
    }),
})

const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/!(*README).md" }),
  schema: ({ image }) =>
    z
      .object({
        ...localeFields,
        title: z.string().max(75),
        image: image().optional(),
        selected: z.boolean().default(false),
        fromDate: yearMonthDateSchema.optional(),
        toDate: yearMonthDateSchema.optional(),
        code: z.url().optional(),
        doc: z.url().optional(),
        paper: z.url().optional(),
        url: z.url().optional(),
        release: z.url().optional(),
        types: z.array(ProjectTypeSchema).default([]),
        skills: z
          .array(z.string().trim().min(1))
          .default([])
          .transform((arr) => dedupPreserveCase(arr)),
        description: z.string().max(200).optional(),
      })
      .refine(
        (data) =>
          !data.fromDate || !data.toDate || data.toDate >= data.fromDate,
        {
          error: "End date must be on or after start date",
        },
      ),
})

const updates = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/updates" }),
  schema: z.object({}),
})

const experience = defineCollection({
  loader: file("./src/content/experience.json"),
  schema: z.object({
    category: z.enum(["work", "research", "education", "teaching"]),
    title: z.string(),
    titleEn: z.string().optional(),
    org: z.string(),
    orgEn: z.string().optional(),
    orgUrl: z.url().optional(),
    startDate: yearMonthDateSchema,
    endDate: yearMonthDateSchema.optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    descriptionEn: z.string().optional(),
  }),
})

export const collections = { blog, experience, people, projects, updates }
