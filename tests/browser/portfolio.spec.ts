import { expect, test } from "@playwright/test"

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme })
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({ json: { comments: [], counts: {}, selected: [] } }),
      )
      await page.route("https://www.youtube-nocookie.com/**", (route) =>
        route.abort(),
      )
    })

    test("layouts and localized content", async ({ page }, testInfo) => {
      for (const route of [
        "/",
        "/projects",
        "/projects/kei-agent",
        "/experience",
        "/blog/kei-agent",
        "/en/blog/kei-agent",
        "/en/privacy",
      ]) {
        await page.goto(route)
        await expect(page.locator("h1")).toBeVisible()
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        if (route.includes("blog/kei-agent")) {
          await expect(page.locator("prose-content figure img")).toHaveCount(3)
          await expect(page.locator("iframe")).toHaveAttribute(
            "src",
            /youtube-nocookie/,
          )
          await expect(page.locator(".post-cover")).toHaveCount(0)
        }
        if (route === "/experience")
          await expect(
            page.locator('a[href="/blog/jigjp-sabera-internship"]'),
          ).toBeVisible()
        if (route === "/en/privacy")
          await expect(page.locator("main")).toContainText("YouTube")
        await page.locator("main img").evaluateAll(async (images) => {
          await Promise.all(
            images.map(async (element) => {
              const image = element as HTMLImageElement
              image.loading = "eager"
              await image.decode()
            }),
          )
        })
        await page.screenshot({
          path: testInfo.outputPath(
            `${route.replaceAll("/", "-") || "home"}.png`,
          ),
          fullPage: true,
        })
      }
    })

    test("search excludes recommendations and clears pending results", async ({
      page,
    }) => {
      for (const prefix of ["", "/en"]) {
        await page.goto(`${prefix}/search?q=Dots`)
        const results = page.locator(".search-result h2 a")
        await expect(results).toHaveCount(2)
        for (const href of await results.evaluateAll((links) =>
          links.map((link) => link.getAttribute("href")),
        ))
          expect(href).toMatch(/\/(blog|projects)\/kei-agent/)
        const input = page.locator("#search-input")
        await input.fill("research")
        await input.fill("")
        await expect(page.locator("site-search [data-status]")).toBeEmpty()
        await expect(results).toHaveCount(0)
      }
    })

    test("keyboard image viewer opens full resolution and restores focus", async ({
      page,
    }) => {
      await page.goto("/blog/kei-agent")
      const trigger = page.locator(".image-viewer-trigger").first()
      await trigger.focus()
      await page.keyboard.press("Enter")
      const dialog = page.locator("image-viewer dialog")
      await expect(dialog).toBeVisible()
      await expect
        .poll(() =>
          page
            .locator(".viewer-image")
            .evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBeGreaterThanOrEqual(1500)
      await dialog.locator("[data-zoom]").click()
      await expect(dialog.locator("[data-zoom]")).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(
        await page
          .locator(".viewer-viewport")
          .evaluate((el) => el.scrollWidth > el.clientWidth),
      ).toBe(true)
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab")
        expect(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        ).toBe(true)
      }
      await page.keyboard.press("Escape")
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
    })

    test("missing routes retain their language", async ({ page }) => {
      for (const prefix of ["", "/en"]) {
        const response = await page.goto(`${prefix}/missing-audit-page`)
        expect(response?.status()).toBe(404)
        await expect(page.locator("html")).toHaveAttribute(
          "lang",
          prefix ? /^en/ : /^ja/,
        )
        await expect(page.locator("h1")).toContainText("404")
      }
    })
  })
}
