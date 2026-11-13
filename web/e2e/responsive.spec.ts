import { expect, test, type Page } from "@playwright/test";
import { PUBLIC_ROUTES } from "../src/lib/site";

const ROUTES = [...PUBLIC_ROUTES, "/missing-page"];

/// Visible headings, buttons, links and cells whose right edge passes the
/// screen. Anything inside a sideways scroll box or a clipping container is
/// meant to extend past it, and so are hidden and screen-reader-only elements.
/// Measured against the configured screen width: on touch devices Chromium
/// widens the layout viewport to fit an over-wide page, so innerWidth alone
/// would hide the overflow it is meant to catch.
async function pastTheEdge(page: Page) {
  const width = page.viewportSize()!.width;
  return page.evaluate((width) => {
    const clips = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o !== "visible") return true;
      }
      return false;
    };
    return [...document.querySelectorAll("h1, h2, button, a, td")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return false;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || el.closest("[inert], [aria-hidden='true']")) return false;
        return r.right > width + 1 && !clips(el);
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}" right=${Math.round(el.getBoundingClientRect().right)}`);
  }, width);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Responsive (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    });

    for (const path of ROUTES) {
      test(`${path} fits the screen`, async ({ page }) => {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        // Tables and figures arrive with the data; measure once they are in.
        await expect(page.locator("main [aria-busy='true'], main .animate-spin")).toHaveCount(0);
        const width = page.viewportSize()!.width;
        const overflow = await page.evaluate((w) => document.documentElement.scrollWidth - w, width);
        expect(overflow, "page is wider than the screen").toBeLessThanOrEqual(0);
        expect(await pastTheEdge(page), "text past the right edge").toEqual([]);
      });
    }
  });
}

test.describe("Responsive", () => {
  test("site navigation works at this size", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Open menu" });
    if (await menu.isVisible()) {
      await menu.click();
      await page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: "Security" }).click();
    } else {
      await page.getByRole("contentinfo").getByRole("link", { name: "Security" }).click();
    }
    await expect(page).toHaveURL(/\/security$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reviewed, tested, and plain about what is left." })).toBeVisible();
  });

  test("money figures never wrap mid-number", async ({ page }) => {
    await page.goto("/positions");
    const cell = page.locator("td.num").first();
    await expect(cell).toBeVisible();
    const { height, line } = await cell.evaluate((el) => {
      const s = getComputedStyle(el);
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5;
      const range = document.createRange();
      range.selectNodeContents(el);
      return { height: range.getBoundingClientRect().height, line: lh };
    });
    expect(height).toBeLessThanOrEqual(line * 1.6);
  });
});
