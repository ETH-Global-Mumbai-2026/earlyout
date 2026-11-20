import { expect, test } from "@playwright/test";

const hero = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Live quote" });

test.describe("Home", () => {
  test("hero shows a per-unit quote with a verdict", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Your redemption, paid today." })).toBeVisible();
    const sheet = hero(page);
    await expect(sheet.getByText("You receive today")).toBeVisible();
    for (const label of ["Service fee", "Pool usage", "Waiting time", "Fund risk"]) {
      await expect(sheet.getByText(label, { exact: true })).toBeVisible();
    }
    const words = await sheet.getByRole("status").allInnerTexts();
    expect(words.filter((w) => ["BUY", "REFUSE", "HALT"].includes(w.trim()))).toHaveLength(1);
  });

  test("hero shows days skipped", async ({ page }) => {
    await page.goto("/");
    await expect(hero(page).getByText(/You skip \d+ (days|hours|minutes)/)).toBeVisible();
  });

  test("reduced motion shows the finished sheet", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const sheet = hero(page);
    await expect(sheet.getByText("You receive today")).toBeVisible({ timeout: 500 + 5_000 });
    await expect(sheet.getByRole("status")).toHaveText(/BUY|REFUSE|HALT/);
    // toBeVisible ignores opacity, so measure what the eye gets: the opacity of
    // the element times every ancestor's. Finished means fully opaque at once.
    const seen = (l: ReturnType<typeof page.locator>) =>
      l.evaluate((el) => {
        let o = 1;
        for (let x: Element | null = el; x; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity);
        return o;
      });
    for (const l of [sheet.getByText("You receive today"), sheet.getByRole("status"), ...["Service fee", "Pool usage", "Waiting time", "Fund risk"].map((t) => sheet.getByText(t, { exact: true }))]) {
      expect(await seen(l)).toBeGreaterThan(0.99);
    }
    // A section that reveals on scroll is fully there as soon as it is in view.
    const later = page.getByRole("heading", { level: 2 }).last();
    await later.scrollIntoViewIfNeeded();
    await expect.poll(() => seen(later), { timeout: 1_000 }).toBeGreaterThan(0.99);
  });

  test("doors rewrite the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "I provide USDC" }).click();
    await expect(hero(page).getByText("Share price")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the vault" })).toBeVisible();
    await page.getByRole("radio", { name: "I run a platform" }).click();
    await expect(hero(page).getByText("GET /api/quote")).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the API" })).toBeVisible();
  });

  test("home has no judge material", async ({ page }) => {
    await page.goto("/");
    for (const t of ["For judges", "Try as judge", "Every abbreviation, spelled out."]) {
      await expect(page.getByText(t)).toHaveCount(0);
    }
    const funds = page.getByRole("table", { name: "Funds" });
    for (const s of ["ACRED", "JAAA", "USCC"]) await expect(funds.getByText(s, { exact: true })).toBeVisible();
  });

  test("daily funds are collapsed", async ({ page }) => {
    await page.goto("/");
    const more = page.getByRole("button", { name: /Also priced/ });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("JTRSY", { exact: true })).toBeHidden();
    await more.click();
    await expect(page.getByText("JTRSY", { exact: true })).toBeVisible();
  });

  test("spread explorer slider updates the time term", async ({ page }) => {
    await page.goto("/");
    const slider = page.getByRole("slider", { name: "Days to payout" });
    await slider.scrollIntoViewIfNeeded();
    const row = page.getByTestId("explorer-time");
    const before = await row.innerText();
    await slider.fill("30");
    await expect(row).not.toHaveText(before);
  });

  test("hero never fakes BUY", async ({ page, isMobile }) => {
    test.skip(isMobile, "uses the desktop sidebar logo link");
    await page.goto("/status?operator");
    await page.getByLabel("Operator key").fill("mock");
    await page.getByRole("button", { name: "Unlock" }).click();
    await page.getByRole("button", { name: "Simulate issuer failure" }).click();
    await expect(page.getByText("Issuer status: FAILED")).toBeVisible();
    await page.getByRole("link", { name: "Earlyout home" }).first().click();
    await expect(hero(page).getByRole("status")).toHaveText("HALT");
    // The sheet must not read as a live offer: no payout promise, and the reason in plain sight.
    await expect(hero(page).getByText("Not available", { exact: true })).toBeVisible();
    await expect(hero(page).getByText(/Issuer reports failure/)).toBeVisible();
    await expect(hero(page).getByText("You receive today")).toHaveCount(0);
  });
});
