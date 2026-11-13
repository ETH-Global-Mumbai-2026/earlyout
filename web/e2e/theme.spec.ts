import { expect, test } from "@playwright/test";

const bodyBg = () => getComputedStyle(document.body).backgroundColor;

test.describe("Theme", () => {
  test("dark preference paints dark first", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(bodyBg)).toBe("rgb(8, 18, 28)");
  });

  test("light canvas is warm paper with the serif display face", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.evaluate(bodyBg)).toBe("rgb(238, 247, 253)");
    const serif = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim());
    expect(serif).not.toBe("");
    await ctx.close();
  });
});
