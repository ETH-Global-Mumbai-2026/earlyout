import { expect, test } from "@playwright/test";

test.describe("Sell", () => {
  test("shows a verdict before anything moves, then sells", async ({ page }) => {
    await page.goto("/sell");
    await expect(page.getByRole("heading", { name: "Sell your pending redemption" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /ACRED/ }).first()).toBeVisible();

    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("BUY", { exact: true })).toBeVisible();
    await expect(page.getByText("You receive now")).toBeVisible();
    for (const term of ["Base", "Vault usage", "Time to payout", "Issuer credit"]) {
      await expect(page.getByText(term, { exact: true })).toBeVisible();
    }

    const sell = page.getByRole("button", { name: /^Sell for \$/ });
    await expect(sell).toBeEnabled();
    await sell.click();
    await expect(page.getByRole("dialog", { name: "Sold" })).toBeVisible();
    await expect(page.getByText("USDC received")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("refuses above the fund cap", async ({ page }) => {
    await page.goto("/sell");
    await page.getByLabel(/Amount in/).fill("1");
    await expect(page.getByText("REFUSE", { exact: true })).toBeVisible();
    await expect(page.getByText("Over the fund cap")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sell", exact: true })).toBeDisabled();
  });

  test("warns when the amount is more than held", async ({ page }) => {
    await page.goto("/sell");
    await page.getByLabel(/Amount in/).fill("999");
    await expect(page.getByText("That is more than you hold.")).toBeVisible();
  });
});

test.describe("Vault", () => {
  test("deposits and withdraws", async ({ page }) => {
    await page.goto("/vault");
    await expect(page.getByText("Share price", { exact: true })).toBeVisible();
    const worth = page.getByText("Your shares are worth").locator("..");
    await expect(worth).toContainText("$0.00");
    await page.getByLabel(/Deposit in USDC/).fill("25");
    await page.getByRole("button", { name: "Deposit USDC" }).click();
    await expect(page.getByLabel(/Deposit in USDC/)).toHaveValue("");
    await expect(worth).toContainText("$25.00");
    await page.getByRole("radio", { name: "Withdraw" }).click();
    await page.getByLabel(/Withdraw in USDC/).fill("5");
    await page.getByRole("button", { name: "Withdraw USDC" }).click();
    await expect(worth).toContainText("$20.00");
  });
});

test.describe("Status", () => {
  test("issuer failure halts quotes and allows the writedown", async ({ page }) => {
    // Demo state lives in the tab, so move between screens with the app's own tabs.
    const tab = (name: string) =>
      page.getByRole("navigation", { name: "App sections" }).filter({ visible: true }).getByRole("link", { name, exact: true });
    await page.goto("/status");
    await page.getByRole("button", { name: "Simulate issuer failure" }).click();
    await expect(page.getByText("Issuer status: FAILED")).toBeVisible();

    await tab("Sell").click();
    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("HALT", { exact: true })).toBeVisible();
    await expect(page.getByText("Issuer reports failure")).toBeVisible();

    await tab("Risk").click();
    await expect(page.getByRole("button", { name: "Mark impaired" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Restore issuer" }).click();
    await expect(page.getByText("Issuer status: OK")).toBeVisible();
  });
});

test.describe("Book", () => {
  test("lists open claims from the book API with Arkiv provenance", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: "Book" })).toBeVisible();
    await expect(page.getByText(/open ·/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Arkiv entity" }).first()).toBeVisible();
    await expect(page.getByText(/Written to Arkiv Rabdi by/)).toBeVisible();
  });
});

test.describe("Site", () => {
  test("landing and company pages render with the shared footer", async ({ page }) => {
    for (const [path, heading] of [
      ["/", "Get paid today. Not when the fund's window opens."],
      ["/how-it-works", "From pending redemption to USDC in one transaction."],
      ["/distributors", "Give your clients an exit between windows."],
      ["/developers", "Contracts, APIs and the public book."],
      ["/security", "Reviewed, tested, and plain about what is left."],
      ["/about", "We sell the wait."],
      ["/legal", "Read this before you click anything."],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText("Not investment advice.", { exact: false })).toBeVisible();
    }
  });

  test("the app renders inside its shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".theme-app")).toHaveCount(0);
    await page.goto("/sell");
    await expect(page.locator(".theme-app")).toHaveCount(1);
  });
});

const ROUTES = ["/", "/how-it-works", "/distributors", "/developers", "/security", "/about", "/legal", "/sell", "/book", "/vault", "/status", "/missing-page"];

test.describe("Responsive", () => {
  for (const path of ROUTES) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, "page is wider than the screen").toBeLessThanOrEqual(0);
    });
  }

  test("site navigation works at this size", async ({ page }, info) => {
    await page.goto("/");
    void info;
    const menu = page.getByRole("button", { name: "Open menu" });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("navigation", { name: "Site" }).filter({ visible: true }).getByRole("link", { name: "Security" }).click();
    await expect(page).toHaveURL(/\/security$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reviewed, tested, and plain about what is left." })).toBeVisible();
  });

  test("app tabs reach every screen at this size", async ({ page }) => {
    await page.goto("/sell");
    for (const [tab, heading] of [["Book", "Book"], ["Vault", "Vault"], ["Risk", "Oracle and risk"], ["Sell", "Sell your pending redemption"]]) {
      await page.getByRole("navigation", { name: "App sections" }).filter({ visible: true }).getByRole("link", { name: tab, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });
});
