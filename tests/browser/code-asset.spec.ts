import { expect, test } from "@playwright/test"

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme })
    test("articles share a cached code stylesheet while highlighting and copying still work", async ({
      page,
      request,
    }) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({
          json: { comments: [], nextCursor: null, counts: {}, mine: [] },
        }),
      )
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              ;(window as unknown as { copiedCode: string }).copiedCode = text
            },
          },
        })
      })
      await page.goto("/blog/ddd-clean-architecture")
      const stylesheet = page.locator(
        'link[rel="stylesheet"][href^="/styles/code-"]',
      )
      await expect(stylesheet).toHaveCount(1)
      const href = await stylesheet.getAttribute("href")
      expect(href).toBeTruthy()
      const response = await request.get(href!)
      expect(response.status()).toBe(200)
      expect(response.headers()["content-type"]).toContain("text/css")
      expect(response.headers()["cache-control"]).toContain("immutable")
      const code = page
        .locator(".expressive-code pre.wrap .ec-line .code")
        .first()
      await expect
        .poll(() =>
          code.evaluate((element) => getComputedStyle(element).whiteSpace),
        )
        .toBe("pre-wrap")
      await page.locator(".expressive-code .copy button").first().click()
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { copiedCode: string }).copiedCode,
          ),
        )
        .toContain("ソースコードの参照")
      await page.locator('a[href="/blog/azure-ai-overview"]').first().click()
      await expect(page.locator("h1")).toContainText("Azure AI")
      await expect(stylesheet).toHaveCount(1)
      await expect(stylesheet).toHaveAttribute("href", href!)
      await expect
        .poll(() =>
          page
            .locator(".expressive-code pre.wrap .ec-line .code")
            .first()
            .evaluate((element) => getComputedStyle(element).whiteSpace),
        )
        .toBe("pre-wrap")
    })
  })
}
