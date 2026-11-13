import { expect, test } from "@playwright/test";
import { APP_NAV } from "../src/components/app/nav";
import { COPY } from "../src/lib/copy";

test.describe("Chrome", () => {
  test("testnet strip on site and app", async ({ page }) => {
    for (const path of ["/", "/sell"]) {
      await page.goto(path);
      const strip = page.getByRole("note", { name: "Testnet notice" });
      await expect(strip).toContainText("Testnet preview.");
      await expect(strip.getByRole("link", { name: "Learn more" })).toHaveAttribute("href", "/legal");
    }
  });

  test("old site links redirect", async ({ page }) => {
    const pairs: [string, string][] = [
      ["/how-it-works", "/holders"],
      ["/distributors", "/platforms"],
      ["/developers", "/docs"],
      ["/about", "/company"],
    ];
    for (const [from, to] of pairs) {
      const res = await page.request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(res.headers()["location"], from).toMatch(new RegExp(`${to}$`));
    }
  });

  test("site menu closes on Escape and on navigation", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone menu only");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    const menu = page.getByRole("dialog", { name: "Site menu" });
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.getByRole("link", { name: "Liquidity" }).click();
    await expect(page).toHaveURL(/\/liquidity$/);
    await expect(menu).toBeHidden();
  });
  test("every site page renders its heading and footer", async ({ page }) => {
    const pages: [string, string][] = [
      ["/", "Your redemption, paid today."],
      ["/holders", "Sell the wait, keep the value."],
      ["/liquidity", "Earn a return on every early exit."],
      ["/platforms", "Give your clients an exit between windows."],
      ["/docs", "Contracts, APIs and the public book."],
      ["/security", "Reviewed, tested, and plain about what is left."],
      ["/company", "We sell the wait."],
      ["/legal", "Read this before you click anything."],
    ];
    for (const [path, h1] of pages) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: h1 }), path).toBeVisible();
      await expect(page.getByText("Not investment advice.", { exact: false }).first(), path).toBeVisible();
    }
  });
  test("sidebar reaches every app screen", async ({ page }) => {
    const h1: Record<string, string> = {
      "/sell": COPY.app.sell.title,
      "/sales": COPY.app.sales.title,
      "/vault": COPY.app.vault.title,
      "/positions": COPY.app.positions.title,
      "/book": COPY.app.book.title,
      "/buy": COPY.app.buy.title,
      "/status": COPY.app.status.title,
      "/api-access": COPY.app.api.title,
    };
    await page.goto("/sell");
    for (const item of APP_NAV.flatMap((g) => g.items)) {
      const open = page.getByRole("button", { name: "Open menu" });
      if (await open.isVisible()) await open.click();
      await page.getByRole("navigation", { name: "App sections" }).filter({ visible: true }).getByRole("link", { name: item.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${item.href}$`));
      await expect(page.getByRole("heading", { level: 1, name: h1[item.href] }), item.href).toBeVisible();
    }
  });

  test("app menu closes on Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone menu only");
    await page.goto("/sell");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "App sections menu" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
});
