import { expect, test } from "@playwright/test"

for (const prefix of ["", "/en"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${prefix || "ja"} ${colorScheme}`, () => {
      test.use({ colorScheme })
      test.beforeEach(async ({ page }) => {
        await page.route("**/api/**", (route) =>
          route.fulfill({ json: { comments: [], counts: {}, mine: [] } }),
        )
        await page.route("https://www.youtube-nocookie.com/**", (route) =>
          route.abort(),
        )
      })

      test("search restores the query and page through back and forward navigation", async ({
        page,
      }) => {
        await page.goto(`${prefix}/`)
        await page.locator(`.site-actions a[href="${prefix}/search"]`).click()
        const input = page.locator("#search-input")
        const results = page.locator(".search-result h2 a")
        await input.fill("Dots")
        await input.press("Enter")
        await expect(results).toHaveCount(2)
        await input.fill("MCP")
        await input.press("Enter")
        await expect(results).toHaveCount(2)

        const title = await results.first().textContent()
        const href = await results.first().getAttribute("href")
        await input.focus()
        await page.keyboard.press("Tab")
        await expect(results.first()).toBeFocused()
        await page.keyboard.press("Enter")
        await expect(page).toHaveURL(new RegExp(`${href}/?$`))
        await expect(page.locator("h1")).toHaveText(title!)

        for (let i = 0; i < 2; i++) {
          await page.goBack()
          await expect(input).toHaveValue("MCP")
          await expect(results).toHaveCount(2)
          expect(new URL(page.url()).searchParams.get("q")).toBe("MCP")
          await page.goForward()
          await expect(page.locator("h1")).toHaveText(title!)
          await expect(input).toHaveCount(0)
        }

        await page.goBack()
        await input.fill("")
        await input.press("Enter")
        await expect(results).toHaveCount(0)
        expect(new URL(page.url()).searchParams.has("q")).toBe(false)
        await page.goBack()
        await expect(page).toHaveURL(new RegExp(`${prefix}/?$`))
        await expect(input).toHaveCount(0)
        await page.goForward()
        await expect(input).toBeEmpty()
        await expect(results).toHaveCount(0)
      })

      test("a failed search download offers keyboard recovery and retains the query", async ({
        page,
      }, testInfo) => {
        await page.route("**/pagefind/pagefind.js", (route) => route.abort())
        await page.goto(`${prefix}/search?q=Dots`)
        const input = page.locator("#search-input")
        const status = page.locator("site-search [data-status]")
        const reload = page.getByRole("button", {
          name: prefix ? "Reload search" : "検索を再読み込み",
        })
        await expect(status).toContainText(prefix ? "Reload" : "再読み込み")
        await expect(status).toHaveAttribute("role", "status")
        await expect(reload).toBeVisible()
        await input.fill("")
        await input.press("Enter")
        await expect(status).toBeEmpty()
        await expect(reload).toBeHidden()
        await input.fill("Dots")
        await input.press("Enter")
        await expect(reload).toBeVisible()
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await page.screenshot({
          path: testInfo.outputPath("search-failure.png"),
        })

        // Import failures are cached for this document, even after the network recovers.
        await page.unroute("**/pagefind/pagefind.js")
        await input.fill("MCP")
        await input.press("Enter")
        await expect(reload).toBeVisible()
        await reload.focus()
        await page.keyboard.press("Enter")
        await expect(page.locator(".search-result")).toHaveCount(2)
        await expect(input).toHaveValue("MCP")
        expect(new URL(page.url()).searchParams.get("q")).toBe("MCP")
        await expect(reload).toBeHidden()
        await expect(page.locator("html")).toHaveAttribute(
          "lang",
          prefix ? /^en/ : /^ja/,
        )
      })

      test("recovery retains edits made before the search debounce", async ({
        page,
      }) => {
        await page.route("**/pagefind/pagefind.js", (route) =>
          route.fulfill({ status: 503, body: "Unavailable" }),
        )
        await page.goto(`${prefix}/search?q=Dots`)
        await expect(page.locator("[data-reload]")).toBeVisible()
        await page.unroute("**/pagefind/pagefind.js")
        // Dispatch and reload in one turn, before the 180 ms timer can run.
        await page.evaluate(() => {
          const input =
            document.querySelector<HTMLInputElement>("#search-input")!
          input.value = "  MCP  "
          input.dispatchEvent(new Event("input", { bubbles: true }))
          document.querySelector<HTMLButtonElement>("[data-reload]")!.click()
        })
        await expect(page.locator("#search-input")).toHaveValue("MCP")
        await expect(page.locator(".search-result")).toHaveCount(2)
        expect(new URL(page.url()).searchParams.get("q")).toBe("MCP")
        await expect(page.locator("[data-recovery]")).toBeHidden()
      })
    })
  }
}

test("RSS home and article links stay in the feed's language", async ({
  page,
}) => {
  for (const prefix of ["", "/en"]) {
    const response = await page.goto(`${prefix}/rss.xml`)
    expect(response?.ok()).toBe(true)
    const feed = await page.evaluate(() => ({
      home: document.querySelector("channel > link")?.textContent,
      articles: Array.from(
        document.querySelectorAll("item > link"),
        (link) => link.textContent,
      ),
    }))
    expect(feed.home).toBe(`https://97kuek.pages.dev${prefix}/`)
    expect(feed.articles.length).toBeGreaterThan(0)
    for (const article of feed.articles)
      expect(article).toMatch(
        new RegExp(`^https://97kuek.pages.dev${prefix}/blog/`),
      )
  }
})
