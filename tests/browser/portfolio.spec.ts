import { expect, test } from "@playwright/test"

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme })
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({ json: { comments: [], counts: {}, mine: [] } }),
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

    test("search follows language switches and preserves the current query", async ({
      page,
    }) => {
      const input = page.locator("#search-input")
      const results = page.locator(".search-result h2 a")
      const expectLocale = async (prefix: string, query: string) => {
        await expect(input).toHaveValue(query)
        await expect(results).toHaveCount(2)
        for (const href of await results.evaluateAll((links) =>
          links.map((link) => link.getAttribute("href")),
        )) {
          expect(href).toMatch(
            new RegExp(`^${prefix}/(blog|projects)/kei-agent/?$`),
          )
        }
        expect(new URL(page.url()).searchParams.get("q")).toBe(query)
      }

      for (const initialPrefix of ["", "/en"]) {
        await page.goto(`${initialPrefix}/search?q=Dots`)
        await expectLocale(initialPrefix, "Dots")
        for (const prefix of [initialPrefix ? "" : "/en", initialPrefix]) {
          // Switch before the input debounce can update the page URL.
          await input.fill("MCP")
          await page.locator("[data-language-switch]").click()
          await expectLocale(prefix, "MCP")
        }
        await page.reload()
        await expectLocale(initialPrefix, "MCP")
        await input.fill("")
        await page.locator("[data-language-switch]").click()
        await expect(input).toBeEmpty()
        await expect(results).toHaveCount(0)
        expect(new URL(page.url()).searchParams.has("q")).toBe(false)
      }
    })

    test("email copy has a visible keyboard focus indicator", async ({
      page,
    }, testInfo) => {
      await page.goto("/")
      await page.locator(".email-link a").focus()
      await page.keyboard.press("Tab")
      const copy = page.locator(".email-copy")
      await expect(copy).toBeFocused()
      await expect
        .poll(() =>
          copy.evaluate((element) => {
            const style = getComputedStyle(element)
            return (
              element.matches(":focus-visible") &&
              style.outlineStyle !== "none" &&
              Number.parseFloat(style.outlineWidth) >= 2 &&
              style.outlineColor !== "rgba(0, 0, 0, 0)"
            )
          }),
        )
        .toBe(true)
      await page.screenshot({
        path: testInfo.outputPath("email-copy-focus.png"),
      })
    })

    test("project image viewer describes the image and restores focus", async ({
      page,
    }, testInfo) => {
      for (const prefix of ["", "/en"]) {
        for (const [slug, description] of [
          [
            "kei-agent",
            prefix ? /Requests pass from Slack/ : /Slackまたは音声通話からDot/,
          ],
          [
            "hrs",
            prefix
              ? /HRS home screen with a hotel photo/
              : /HRSのトップ画面。ホテルの写真/,
          ],
          [
            "wasa-chat",
            prefix
              ? /A human-powered aircraft with long wings/
              : /滑走路の上を進む長い翼の人力飛行機/,
          ],
        ] as const) {
          await page.goto(`${prefix}/projects/${slug}`)
          const trigger = page.locator(".project-hero .image-viewer-trigger")
          await expect(trigger).toHaveAccessibleName(description)
          await trigger.focus()
          await page.keyboard.press("Enter")
          const dialog = page.locator("image-viewer dialog")
          await expect(dialog).toBeVisible()
          await expect(dialog.locator("[data-caption]")).toHaveText(description)
          await expect(dialog.locator(".viewer-image")).toHaveAttribute(
            "alt",
            description,
          )
          if (slug === "kei-agent") {
            await page.screenshot({
              path: testInfo.outputPath(
                `project-image-${prefix ? "en" : "ja"}.png`,
              ),
            })
          }
          await page.keyboard.press("Escape")
          await expect(dialog).not.toBeVisible()
          await expect(trigger).toBeFocused()
        }
      }
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
