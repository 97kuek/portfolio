import { expect, test } from "@playwright/test"

test("copyright year survives client navigation and history", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2030-06-15T12:00:00Z"))
  await page.goto("/")
  const year = String(await page.evaluate(() => new Date().getFullYear()))
  await expect(page.locator("#current-year")).toHaveText(year)
  await page.evaluate(() => {
    Object.assign(window, { navigationMarker: true })
  })
  const desktopLink = page.locator('a.nav-link[href="/projects"]')
  if (await desktopLink.isVisible()) {
    await desktopLink.click()
  } else {
    await page.locator(".mobile-menu-trigger").click()
    await page.locator('[data-nav-link="/projects"]').click()
  }
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.locator("h1")).toBeVisible()
  await expect(page.locator("#current-year")).toHaveText(year)
  expect(await page.evaluate(() => "navigationMarker" in window)).toBe(true)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator("#current-year")).toHaveText(year)
})

test("copyright year is present without JavaScript", async ({ browser }) => {
  const page = await browser.newPage({ javaScriptEnabled: false })
  try {
    await page.goto("/en/projects")
    await expect(page.locator("#current-year")).toHaveText(/^\d{4}$/)
  } finally {
    await page.close()
  }
})

test("sitemap URLs and language alternatives serve canonical pages without redirects", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap-0.xml")
  expect(sitemap.status()).toBe(200)
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]),
  )
  expect(urls.length).toBeGreaterThan(0)
  const checked = new Set<string>()
  for (const url of urls) {
    const response = await request.get(url.pathname, { maxRedirects: 0 })
    expect(response.status(), url.pathname).toBe(200)
    const html = await response.text()
    expect(html).toContain(`rel="canonical" href="${url.href}"`)
    for (const [, href] of html.matchAll(
      /<link[^>]*rel="alternate"[^>]*hreflang="[^"]+"[^>]*href="([^"]+)"/g,
    )) {
      const alternate = new URL(href)
      if (!checked.has(alternate.pathname)) {
        const translation = await request.get(alternate.pathname, {
          maxRedirects: 0,
        })
        expect(translation.status(), alternate.pathname).toBe(200)
        checked.add(alternate.pathname)
      }
    }
    if (url.pathname !== "/") {
      const alias = await request.get(`${url.pathname}/`, { maxRedirects: 0 })
      expect([301, 308], `${url.pathname}/`).toContain(alias.status())
      expect(new URL(alias.headers().location, url).pathname).toBe(url.pathname)
    }
  }
})

test("search results link directly to the canonical page", async ({
  page,
  request,
}) => {
  for (const prefix of ["", "/en"]) {
    await page.goto(`${prefix}/search?q=WASA`)
    const results = page.locator(".search-result h2 a")
    await expect.poll(() => results.count()).toBeGreaterThanOrEqual(2)
    for (const href of await results.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    )) {
      const url = new URL(href)
      expect(url.pathname.endsWith("/")).toBe(false)
      const response = await request.get(url.pathname, { maxRedirects: 0 })
      expect(response.status(), url.pathname).toBe(200)
      const canonical = (await response.text()).match(
        /rel="canonical" href="([^"]+)"/,
      )
      expect(canonical).not.toBeNull()
      expect(new URL(canonical![1]).pathname).toBe(url.pathname)
    }
  }
})

for (const prefix of ["", "/en"]) {
  for (const entry of ["direct", "header"]) {
    test(`search history restores results after back and detail after forward (${prefix || "ja"}, ${entry})`, async ({
      page,
    }) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({
          json: { comments: [], nextCursor: null, counts: {}, mine: [] },
        }),
      )
      if (entry === "direct") {
        await page.goto(`${prefix}/search?q=WASA`)
      } else {
        await page.goto(prefix || "/")
        await page.locator(`.site-actions a[href="${prefix}/search"]`).click()
        await page.evaluate(() => customElements.whenDefined("site-search"))
        await page.locator("#search-input").fill("WASA")
      }

      const input = page.locator("#search-input")
      const results = page.locator(".search-result h2 a")
      const projectResult = page.locator(
        `.search-result h2 a[href="${prefix}/projects/wasa-chat"]`,
      )
      await expect.poll(() => results.count()).toBeGreaterThanOrEqual(2)
      await projectResult.click()
      await expect(page.locator("h1")).toHaveText("WASA Chat")

      await page.goBack()
      await expect(page).toHaveURL(new RegExp(`${prefix}/search\\?q=WASA$`))
      await expect(input).toHaveValue("WASA")
      await expect(page.locator("h1")).toHaveText(prefix ? "Search" : "検索")
      await expect.poll(() => results.count()).toBeGreaterThanOrEqual(2)
      await expect(projectResult).toBeVisible()
      await expect(
        page.locator(`.search-result h2 a[href="${prefix}/blog/hello"]`),
      ).toBeVisible()

      await page.goForward()
      await expect(page).toHaveURL(new RegExp(`${prefix}/projects/wasa-chat$`))
      await expect(page.locator("h1")).toHaveText("WASA Chat")
      await expect(input).toHaveCount(0)
    })
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme })
    test("back-to-top stays clear of comments and works outside the form", async ({
      page,
    }, testInfo) => {
      await page.route("**/api/**", (route) =>
        route.fulfill({
          json: { comments: [], nextCursor: null, counts: {}, mine: [] },
        }),
      )
      await page.goto("/blog/azure-ai-overview")
      const top = page.locator("back-to-top button")
      const heading = page.locator("prose-content h2").nth(2)
      await heading.scrollIntoViewIfNeeded()
      await expect(top).toBeVisible()
      await page.locator(".comment-form").scrollIntoViewIfNeeded()
      await expect(page.locator(".comment-submit")).toBeVisible()
      await expect(top).toBeHidden()
      await page.locator('textarea[name="body"]').focus()
      await expect(top).toBeHidden()
      await page.locator("post-comments").screenshot({
        path: testInfo.outputPath("comments-clear-controls.png"),
      })
      await heading.scrollIntoViewIfNeeded()
      await expect(top).toBeVisible()
      await top.click()
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeLessThanOrEqual(1)
      await expect(top).toBeHidden()
    })
  })
}
