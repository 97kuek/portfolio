import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import satori from "satori"
import sharp from "sharp"

import { SITE } from "@site-config"

type RenderPostImageOptions = {
  title: string
  description?: string
  /**
   * The entry's cover. `fsPath` is where Astro keeps the original on disk;
   * it is not part of the public `ImageMetadata` type, so it is read
   * defensively and the card falls back to its plain form without one.
   */
  image?: { fsPath?: string }
}

/** Text on the plain card, and on one laid over a photograph. */
const PALETTE = {
  plain: {
    background: "#F1F2F6",
    title: "#565B78",
    body: "#7A7E96",
  },
  photo: {
    title: "#FFFFFF",
    body: "rgba(255, 255, 255, 0.82)",
  },
} as const

type SatoriNode = {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: SatoriChild
  }
}

type SatoriChild = SatoriNode | SatoriNode[] | string | null | undefined

const width = 1200
const height = 630
const domain = new URL(SITE.href).hostname.replace(/^www\./, "")

function readFont(relativePath: string, sourcePath: string): Buffer {
  const modulePath = fileURLToPath(new URL(relativePath, import.meta.url))
  return readFileSync(
    existsSync(modulePath) ? modulePath : resolve(process.cwd(), sourcePath),
  )
}

const regularFont = readFont(
  "../assets/og/DMSans-Regular.ttf",
  "src/assets/og/DMSans-Regular.ttf",
)
const boldFont = readFont(
  "../assets/og/DMSans-Bold.ttf",
  "src/assets/og/DMSans-Bold.ttf",
)

/* DM Sans covers Latin only, so a Japanese title would render as blanks. These
   are Noto Sans JP subset to kana, punctuation and the 3,000 most common kanji
   (see scripts/subset-og-font.mjs). They are read at build time to draw the
   images and never reach a browser, so their size costs nothing at runtime. */
const japaneseRegularFont = readFont(
  "../assets/og/NotoSansJP-Regular-subset.ttf",
  "src/assets/og/NotoSansJP-Regular-subset.ttf",
)
const japaneseBoldFont = readFont(
  "../assets/og/NotoSansJP-Bold-subset.ttf",
  "src/assets/og/NotoSansJP-Bold-subset.ttf",
)

/**
 * Where the generated card for an entry lives. Keyed by entry id, which is
 * already unique across languages (`hello` and `hello-en`), so a translation
 * gets its own card without a locale segment in the path.
 */
export const ogImagePath = (
  collection: "blog" | "projects",
  entryId: string,
): string => `/og/${collection}/${entryId}.png`

/**
 * The cover, cropped to the card and darkened, as a data URI.
 *
 * The scrim is a gradient rather than a flat wash: the card puts text at the
 * top, middle and foot, and a photograph that is bright in one band would
 * swallow whichever line lands there. Returns undefined if the file cannot be
 * read, so a missing or unreadable cover costs a card its photo and nothing
 * more.
 */
async function readCover(fsPath: string): Promise<string | undefined> {
  const scrim = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0B0D1A" stop-opacity="0.58"/>
        <stop offset="0.55" stop-color="#0B0D1A" stop-opacity="0.66"/>
        <stop offset="1" stop-color="#0B0D1A" stop-opacity="0.78"/>
      </linearGradient>
      <rect width="${width}" height="${height}" fill="url(#s)"/>
    </svg>`,
  )

  try {
    const jpeg = await sharp(fsPath)
      .rotate()
      .resize(width, height, { fit: "cover", position: "attention" })
      .composite([{ input: scrim }])
      .jpeg({ quality: 78 })
      .toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`
  } catch {
    return undefined
  }
}

export async function renderPostImage({
  title,
  description,
  image,
}: RenderPostImageOptions): Promise<Buffer> {
  const cover = image?.fsPath ? await readCover(image.fsPath) : undefined
  const ink = cover ? PALETTE.photo : PALETTE.plain
  const titleFontSize = title.length <= 60 ? 64 : 52
  const middleChildren: SatoriNode[] = [
    {
      type: "div",
      props: {
        style: {
          width: 96,
          height: 6,
          marginBottom: 28,
          borderRadius: 3,
          background: "#6FBF5A",
        },
      },
    },
    {
      type: "div",
      props: {
        style: {
          maxHeight: titleFontSize * 1.15 * 3,
          overflow: "hidden",
          color: ink.title,
          fontSize: titleFontSize,
          fontWeight: 700,
          lineHeight: 1.15,
          lineClamp: 3,
        },
        children: title,
      },
    },
  ]

  if (description) {
    middleChildren.push({
      type: "div",
      props: {
        style: {
          maxHeight: 30 * 1.4 * 2,
          marginTop: 24,
          overflow: "hidden",
          color: ink.body,
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.4,
          lineClamp: 2,
        },
        children: description,
      },
    })
  }

  const content: SatoriNode = {
    type: "div",
    props: {
      style: {
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              color: ink.body,
              fontSize: 28,
              fontWeight: 400,
            },
            children: SITE.title,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
            },
            children: middleChildren,
          },
        },
        {
          type: "div",
          props: {
            style: {
              color: ink.body,
              fontSize: 26,
              fontWeight: 400,
            },
            children: domain,
          },
        },
      ],
    },
  }

  /* The cover sits out of flow behind the text rather than beside it, so a
     long Japanese title keeps the full width of the card to wrap into. */
  const card: SatoriNode = {
    type: "div",
    props: {
      style: {
        width,
        height,
        display: "flex",
        position: "relative",
        background: PALETTE.plain.background,
        fontFamily: "DM Sans, Noto Sans JP",
      },
      children: cover
        ? [
            {
              type: "img",
              props: {
                src: cover,
                width,
                height,
                style: { position: "absolute", top: 0, left: 0 },
              } as SatoriNode["props"],
            },
            content,
          ]
        : [content],
    },
  }

  const svg = await satori(card as never, {
    width,
    height,
    fonts: [
      { name: "DM Sans", data: regularFont, weight: 400, style: "normal" },
      { name: "DM Sans", data: boldFont, weight: 700, style: "normal" },
      {
        name: "Noto Sans JP",
        data: japaneseRegularFont,
        weight: 400,
        style: "normal",
      },
      {
        name: "Noto Sans JP",
        data: japaneseBoldFont,
        weight: 700,
        style: "normal",
      },
    ],
  })

  return sharp(Buffer.from(svg)).png().toBuffer()
}
