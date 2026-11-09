import { expect, test } from "@playwright/test"
import { markdownToHtml } from "satteri"

import { satteriSidenotes } from "../../src/plugins/satteri-sidenotes"

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme })
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({ json: { comments: [], counts: {}, mine: [] } }),
      )
    })

    test("Japanese tags open the matching article list", async ({ page }) => {
      await page.goto("/blog/azure-ai-overview")
      await page
        .locator(".post-badges a")
        .filter({ hasText: "学習ノート" })
        .click()
      await expect(page).toHaveURL(
        /\/blog\/tags\/%E5%AD%A6%E7%BF%92%E3%83%8E%E3%83%BC%E3%83%88\/?$/,
      )
      await expect(page.locator("h1")).toContainText("学習ノート")
      await expect(
        page.locator('main a[href="/blog/azure-ai-overview"]'),
      ).toBeVisible()
      await expect(
        page.locator('main a[href="/blog/ddd-clean-architecture"]'),
      ).toBeVisible()
    })

    test("footnotes toggle by pointer and keyboard without overflowing", async ({
      page,
    }, testInfo) => {
      const { html } = await markdownToHtml(
        `本文の終わりにある脚注です。[^note]\n\n[^note]: 長い注釈です。${"longword".repeat(30)}`,
        { hastPlugins: satteriSidenotes() },
      )
      await page.goto("/blog/azure-ai-overview")
      await page
        .locator("prose-content")
        .first()
        .evaluate((element, content) => {
          element.innerHTML = content
        }, html)
      const note = page.locator(".sidenote")
      const toggle = page.locator(".sidenote-toggle-checkbox")
      const label = page.locator("label.sidenote-number")
      await expect(note).toBeHidden()
      await label.click()
      await expect(note).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      await toggle.focus()
      await page.keyboard.press("Space")
      await expect(note).toBeHidden()
      await page.keyboard.press("Space")
      await expect(note).toBeVisible()
      await expect
        .poll(() =>
          label.evaluate((element) => getComputedStyle(element).outlineStyle),
        )
        .not.toBe("none")
      await page.screenshot({
        path: testInfo.outputPath("footnotes.png"),
        fullPage: true,
      })
    })
  })
}
