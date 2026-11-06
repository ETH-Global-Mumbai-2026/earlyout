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
    await expect(page.getByText("Share price")).toBeVisible();
    await page.getByLabel(/Deposit in USDC/).fill("25");
    await page.getByRole("button", { name: "Deposit USDC" }).click();
    await expect(page.getByRole("button", { name: "Deposit USDC" })).toBeEnabled();
    await page.getByRole("radio", { name: "Withdraw" }).click();
    await page.getByLabel(/Withdraw in USDC/).fill("5");
    await page.getByRole("button", { name: "Withdraw USDC" }).click();
    await expect(page.getByRole("button", { name: "Withdraw USDC" })).toBeEnabled();
  });
});

test.describe("Status", () => {
  test("issuer failure halts quotes and allows the writedown", async ({ page }) => {
    await page.goto("/status");
    await page.getByRole("button", { name: "Simulate issuer failure" }).click();
    await expect(page.getByText("Issuer status: FAILED")).toBeVisible();

    await page.goto("/sell");
    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("HALT", { exact: true })).toBeVisible();
    await expect(page.getByText("Issuer reports failure")).toBeVisible();

    await page.goto("/status");
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
      ["/", "Early exit for funds that redeem on a schedule."],
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

  test("theme toggle switches to light and back", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Switch to light mode" }).first().click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Switch to dark mode" }).first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
