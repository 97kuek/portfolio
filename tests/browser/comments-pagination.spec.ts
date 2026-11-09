import { expect, test } from "@playwright/test"

for (const locale of ["", "/en"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${locale || "ja"} ${colorScheme}`, () => {
      test.use({ colorScheme })

      test("posting after an initial load failure restores access to older comments", async ({
        page,
      }, testInfo) => {
        const comment = (id: number) => ({
          id,
          author: "Reader",
          body: `comment-${id}`,
          createdAt: "2026-11-09T02:00:00.000Z",
        })
        await page.route("**/api/**", (route) =>
          route.fulfill({ json: { counts: {}, mine: [] } }),
        )
        await page.route("**/api/comments**", (route) => {
          if (route.request().method() === "POST") {
            return route.fulfill({
              json: {
                comments: [comment(2), comment(3)],
                nextCursor: 2,
                pending: false,
              },
            })
          }
          if (
            new URL(route.request().url()).searchParams.get("before") === "2"
          ) {
            return route.fulfill({
              json: { comments: [comment(1)], nextCursor: null },
            })
          }
          return route.fulfill({ status: 503, json: { error: "Unavailable" } })
        })
        await page.goto(`${locale}/blog/hello`)
        await expect(page.locator("post-comments [data-status]")).toContainText(
          locale ? "could not" : "読み込めません",
        )
        await page.locator('textarea[name="body"]').fill("comment-3")
        await page.locator(".comment-submit").click()
        await expect(page.locator(".comment-item")).toHaveCount(2)
        const older = page.locator("[data-load-more]")
        await expect(older).toBeVisible()
        await page
          .locator("post-comments")
          .screenshot({ path: testInfo.outputPath("comment-pagination.png") })
        await older.click()
        await expect(page.locator(".comment-body")).toHaveText([
          "comment-1",
          "comment-2",
          "comment-3",
        ])
        await expect(older).toBeHidden()
      })
    })
  }
}
