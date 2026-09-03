import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"
import { satteri } from "@astrojs/markdown-satteri"
import {
  blockExpressiveCode,
  inlineExpressiveCode,
} from "./src/lib/expressive-code"
import { temmlMath } from "./src/lib/math"
import { calloutDirective } from "./src/lib/callout"
import { externalLinks } from "./src/lib/external-links"
import { headingNamespace } from "./src/lib/heading-namespace"
import { headingAnchors } from "./src/lib/heading-anchors"
import { imageFigures } from "./src/plugins/satteri-image-figures"
import { satteriSidenotes } from "./src/plugins/satteri-sidenotes"
import { collapseCjkLineBreaks } from "./src/plugins/satteri-cjk-line-breaks"
import { normalizeHeadings } from "./src/plugins/satteri-normalize-headings"

export default defineConfig({
  site: "https://97kuek.pages.dev",
  compressHTML: true,
  trailingSlash: "never",
  output: "static",
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  image: {
    responsiveStyles: true,
    layout: "constrained",
    remotePatterns: [
      { protocol: "data" },
      { protocol: "https", hostname: "gravatar.com" },
    ],
  },
  integrations: [
    sitemap({
      // The palette is a development reference for the theme's own tokens,
      // not a page anyone should reach from a search result.
      filter: (page) =>
        !/\/blog\/[^/]+\/[^/]+\/?$/.test(page) &&
        !/\/people\/[^/]+\/?$/.test(page) &&
        !page.includes("/blog/tags/") &&
        !page.includes("/blog/stages/") &&
        !page.includes("/palette") &&
        !page.includes("/search"),
    }),
  ],
  server: { port: 4321, host: true },
  devToolbar: { enabled: false },
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { directive: true, math: true, wikilinks: true },
      mdastPlugins: [
        collapseCjkLineBreaks,
        normalizeHeadings,
        calloutDirective,
        inlineExpressiveCode,
        temmlMath,
      ],
      hastPlugins: [
        imageFigures,
        externalLinks,
        // Passed as a factory, not an instance: the plugin emits its base
        // styles and scripts into the first code block it sees, and Satteri
        // resolves a factory once per file. Calling it here instead would
        // share one instance across the build, so only the first page with a
        // code block would carry the stylesheet.
        blockExpressiveCode,
        ...satteriSidenotes(),
        headingNamespace(),
        headingAnchors(),
      ],
    }),
  },
})
