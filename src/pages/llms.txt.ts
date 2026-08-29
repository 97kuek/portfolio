import type { APIRoute } from "astro"

import { PROFILE, SITE } from "@site-config"

import { getProfileLinkHref } from "@/components/profile/helper"

const llmsTxt = `
# LLMs.txt

This file contains information about this website for AI language models.

## Website Information

- Site URL: ${SITE.href}
- Owner: ${PROFILE.name} (Keitaro Ueki) - ${PROFILE.tagline}
- Content: Personal profile, education, AI engineering projects, and blog posts
- Languages: Japanese (default) and English (under /en)
- Last Updated: ${new Date().toISOString().split("T")[0]}

## Content Overview

This website contains:
- A bilingual personal profile
- Education and experience
- AI engineering and software projects as they become available
- Learning notes and blog posts as they become available

## Usage Guidelines

- This content is available for learning and reference purposes
- Respect copyright and attribution requirements
- Cite or link back to the original page when reusing content
- Check each repository for the license that applies to code examples

## Sitemap

For a complete list of pages, see: ${new URL("sitemap-index.xml", SITE.href).href}

## Profile

GitHub: ${getProfileLinkHref("github") ?? ""}
`.trim()

export const GET: APIRoute = () =>
  new Response(llmsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
