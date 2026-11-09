import type { z } from "astro/zod"

import type {
  FooterConfigSchema,
  ProfileConfigSchema,
  SiteConfigSchema,
} from "@/schemas"

export type LinkConfig = {
  href: string
  label: string
}

// Used in site config
export type ProfileConfig = z.infer<typeof ProfileConfigSchema>
export type FooterConfig = z.infer<typeof FooterConfigSchema>
export type SiteConfig = z.infer<typeof SiteConfigSchema>
