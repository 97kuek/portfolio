import { expect, test } from "@playwright/test"

for (const locale of ["", "/en"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${locale || "ja"} ${colorScheme}`, () => {
      test.use({ colorScheme })
      test.beforeEach(async ({ page }) => {
        await page.route("**/api/**", (route) =>
          route.fulfill({ json: { comments: [], counts: {}, mine: [] } }),
        )
        await page.route(
          /^https:\/\/(www\.youtube-nocookie\.com|static\.cloudflareinsights\.com)\//,
          (route) => route.abort(),
        )
      })

      test("comment drafts survive privacy visits and reloads, stay scoped, and clear after posting", async ({
        page,
      }) => {
        await page.goto(`${locale}/blog/kei-agent`)
        const author = page.locator('input[name="author"]')
        const body = page.locator('textarea[name="body"]')
        await author.fill("Reader")
        await body.fill("An unfinished comment")
        for (let i = 0; i < 2; i++) {
          await page.locator(".comment-privacy").click()
          await expect(page).toHaveURL(new RegExp(`${locale}/privacy/?$`))
          await page.goBack()
          await expect(body).toHaveValue("An unfinished comment")
          await expect(author).toHaveValue("Reader")
        }
        await page.reload()
        await expect(body).toHaveValue("An unfinished comment")
        await page.goto(`${locale}/projects/kei-agent`)
        await expect(body).toBeEmpty()
        await page.goto(`${locale}/blog/kei-agent`)
        await expect(body).toHaveValue("An unfinished comment")
        await page.route("**/api/comments", (route) =>
          route.fulfill({ status: 503, json: {} }),
        )
        await page.locator(".comment-submit").click()
        await expect(page.locator("post-comments [data-status]")).toContainText(
          locale ? "Could not" : "できません",
        )
        await expect(body).toHaveValue("An unfinished comment")
        await page.route("**/api/comments", (route) =>
          route.fulfill({ json: { comments: [], pending: true } }),
        )
        await page.locator(".comment-submit").click()
        await expect(body).toBeEmpty()
        await page.reload()
        await expect(body).toBeEmpty()
        await expect(author).toBeEmpty()
      })

      test("posting does not discard edits made while waiting", async ({
        page,
      }) => {
        await page.goto(`${locale}/blog/kei-agent`)
        let release!: () => void
        const pending = new Promise<void>((resolve) => {
          release = resolve
        })
        await page.route("**/api/comments", async (route) => {
          await pending
          await route.fulfill({ json: { comments: [] } })
        })
        const body = page.locator('textarea[name="body"]')
        await body.fill("First draft")
        await page.locator(".comment-submit").click()
        await expect(page.locator(".comment-submit")).toBeDisabled()
        await body.fill("Keep this newer draft")
        release()
        await expect(page.locator(".comment-submit")).toBeEnabled()
        await expect(body).toHaveValue("Keep this newer draft")
        await page.reload()
        await expect(body).toHaveValue("Keep this newer draft")
      })

      test("reaction failures are visible and announced, with retry recovery", async ({
        page,
      }) => {
        await page.route("**/api/reactions**", (route) =>
          route.fulfill({ status: 503, json: {} }),
        )
        await page.goto(`${locale}/blog/kei-agent`)
        const status = page.locator("[data-reaction-status]")
        await expect(status).toContainText(
          locale ? "Could not load" : "読み込めません",
        )
        await expect(status).not.toHaveClass("sr-only")
        await expect(status).toHaveAttribute("role", "status")
        await expect(status).toHaveAttribute("aria-live", "polite")
        const button = page.locator('.reaction[data-kind="like"]')
        for (const networkError of [false, true]) {
          if (networkError)
            await page.route("**/api/reactions**", (route) => route.abort())
          await button.click()
          await expect(status).toContainText(
            locale ? "Could not send" : "送信できません",
          )
          await expect(status).not.toHaveClass("sr-only")
          await expect(button).toBeEnabled()
          await expect(button).toHaveAttribute("aria-pressed", "false")
        }
        await page.route("**/api/reactions**", (route) =>
          route.fulfill({ json: { counts: { like: 1 }, mine: ["like"] } }),
        )
        await button.click()
        await expect(button).toHaveAttribute("aria-pressed", "true")
        await expect(status).toHaveClass("sr-only")
        await expect(status).toContainText("1")
      })

      test("copy recovers from repeated clicks, denial, and navigation during a pending copy", async ({
        page,
      }) => {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: async () => {} },
          })
        })
        await page.goto(`${locale}/blog/kei-agent`)
        const copy = page.locator(".share-actions [data-copy-btn]")
        const label = copy.locator(".copy-label")
        const original = locale ? "Copy URL" : "URLをコピー"
        const copied = locale ? "Copied!" : "コピーしました"
        for (let i = 0; i < 3; i++) {
          await copy.click()
          await expect(label).toHaveText(copied)
        }
        await expect(label).toHaveText(original)
        await expect(copy.locator(".check-icon")).toHaveAttribute("hidden", "")
        await page.evaluate(() => {
          navigator.clipboard.writeText = async () => {
            throw new Error("denied")
          }
        })
        await copy.click()
        await expect(label).toContainText(
          locale ? "Could not copy" : "コピーできません",
        )
        await expect(label).toHaveText(original)
        await page.evaluate(() => {
          navigator.clipboard.writeText = () => new Promise(() => {})
        })
        await copy.click()
        await page.locator(".comment-privacy").click()
        await expect(page).toHaveURL(new RegExp(`${locale}/privacy/?$`))
        await page.goBack()
        await expect(label).toHaveText(original)
        await page.evaluate(() => {
          navigator.clipboard.writeText = async () => {}
        })
        await copy.click()
        await expect(label).toHaveText(copied)
        await expect(label).toHaveText(original)
      })
    })
  }
}
