import type {
  FooterConfig,
  LinkConfig,
  ProfileConfig,
  PublicationConfig,
  SiteConfig,
} from "@/types"

export const SITE: SiteConfig = {
  title: "植木 敬太郎",
  description:
    "早稲田大学で情報通信を学ぶAIエンジニア、植木敬太郎のポートフォリオ。",
  href: "https://97kuek.pages.dev/",
  author: "Keitaro Ueki",
  dir: "ltr",
  defaultPageImage: "/img/social-preview.jpg",
  defaultPostImage: "/img/social-preview.jpg",

  locale: {
    lang: "ja-JP",
    options: {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  },

  // Table of contents depth shared by blog posts and project detail pages.
  tocMaxDepth: 3,

  blog: {
    postsPerPage: 8,
    relatedPostCount: 3,
    shareActions: ["x"],
  },

  home: {
    careerHighlightCount: 3,
    projectCount: 3,
    postCount: 2,
  },

  analytics: {
    cloudflareToken: "c1261f35fd9748ebb88e9a13cb4d0757",
  },

  favicon: "/favicon.ico",
  prerender: true,
  npmCDN: "https://cdn.jsdelivr.net/npm",

  license: {
    label: "CC-BY-4.0",
    href: "https://creativecommons.org/licenses/by/4.0/",
  },
}

export const PROFILE: ProfileConfig = {
  name: SITE.title,
  othernames: "Keitaro Ueki",
  tagline: "ML Researcher & AI Engineer",
  taglineJa: "MLリサーチャー&AIエンジニア",
  email: "ueki.keitaro@gmail.com",
  links: {
    github: "https://github.com/97kuek",
    instagram: "https://www.instagram.com/97kuek_/",
  },
  highlightLinks: ["github"],
  linksPlacement: {
    header: ["github", "instagram", "email"],
    about: ["github", "instagram", "email"],
    footer: ["github", "instagram", "email"],
  },
}

export const NAV_LINKS: LinkConfig[] = [
  { href: "/projects", label: "Projects" },
  { href: "/experience", label: "Experience" },
  { href: "/blog", label: "Blog" },
]

export const NAVIGATION: LinkConfig[] = NAV_LINKS.map(({ href, label }) => ({
  href,
  label,
}))

export const PUB_CONFIG: PublicationConfig = {
  maxFirstAuthors: 6,
  maxLastAuthors: 1,
  highlightAuthor: {
    firstName: "Keitaro",
    lastName: "Ueki",
    aliases: ["K. Ueki", "植木 敬太郎"],
  },
  equalSymbols: {
    first: "*",
    second: "†",
    third: "‡",
    last: "§",
  },
}

export const FOOTER: FooterConfig = {
  credits: true,
  sourceCode: "https://github.com/97kuek/portfolio",
  sourceContent: "https://github.com/97kuek/portfolio/tree/main/src/content",
  footerLinks: [],
}

if (import.meta.env.DEV && typeof window === "undefined") {
  const {
    FooterConfigSchema,
    ProfileConfigSchema,
    PublicationConfigSchema,
    SiteConfigSchema,
  } = await import("@/schemas")
  SiteConfigSchema.parse(SITE)
  ProfileConfigSchema.parse(PROFILE)
  FooterConfigSchema.parse(FOOTER)
  PublicationConfigSchema.parse(PUB_CONFIG)
}
