import { expect, test } from "@playwright/test"

test.describe("profile portrait at 2x", () => {
  test.use({ deviceScaleFactor: 2 })

  test("downloads a portrait-sized candidate for its rendered box", async ({
    page,
  }) => {
    await page.goto("/")
    const image = page.locator('img[data-slot="profile-avatar"]')
    const selection = await image.evaluate(
      async (element: HTMLImageElement) => {
        await element.decode()
        const candidate = element.srcset
          .split(",")
          .map((value) => {
            const [url, descriptor] = value.trim().split(/\s+/)
            return {
              url: new URL(url, location.href).href,
              width: Number.parseFloat(descriptor),
            }
          })
          .find(({ url }) => url === element.currentSrc)
        return {
          selectedWidth: candidate?.width,
          renderedWidth: element.getBoundingClientRect().width,
        }
      },
    )
    expect(selection.selectedWidth).toBeGreaterThanOrEqual(
      selection.renderedWidth * 2,
    )
    expect(selection.selectedWidth).toBeLessThanOrEqual(480)
  })
})

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`article photos at ${deviceScaleFactor}x`, () => {
    test.use({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor,
    })

    test("normal reading downloads a bounded candidate while the viewer retains full resolution", async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop",
        "Desktop candidate selection",
      )
      await page.route("**/api/**", (route) =>
        route.fulfill({ json: { comments: [], counts: {}, mine: [] } }),
      )
      await page.goto("/blog/hello")
      const source = page.locator("prose-content figure img").first()
      await source.scrollIntoViewIfNeeded()
      const selection = await source.evaluate(
        async (image: HTMLImageElement) => {
          await image.decode()
          const candidates = image.srcset.split(",").map((candidate) => {
            const [url, descriptor] = candidate.trim().split(/\s+/)
            return {
              url: new URL(url, location.href).href,
              width: Number.parseFloat(descriptor),
            }
          })
          candidates.sort((a, b) => b.width - a.width)
          return {
            selectedWidth: candidates.find(
              ({ url }) => url === image.currentSrc,
            )?.width,
            largest: candidates[0],
            renderedWidth: image.getBoundingClientRect().width,
          }
        },
      )

      expect(selection.renderedWidth).toBeLessThanOrEqual(704)
      expect(selection.selectedWidth).toBeGreaterThan(0)
      expect(selection.selectedWidth).toBeLessThanOrEqual(
        deviceScaleFactor === 1 ? 828 : 1668,
      )
      expect(selection.largest.width).toBeGreaterThanOrEqual(2000)
      await page.locator("prose-content .image-viewer-trigger").first().click()
      const viewer = page.locator("image-viewer dialog")
      await expect(viewer).toBeVisible()
      await expect(viewer.locator(".viewer-image")).toHaveJSProperty(
        "src",
        selection.largest.url,
      )
      await expect
        .poll(() =>
          viewer
            .locator(".viewer-image")
            .evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBeGreaterThanOrEqual(2000)
    })
  })
}
