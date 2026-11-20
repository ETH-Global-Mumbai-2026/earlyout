import { expect, test } from "@playwright/test";

test.describe("Sell", () => {
  test("shows a verdict before anything moves, then sells", async ({ page }) => {
    await page.goto("/sell");
    await expect(page.getByRole("heading", { name: "Sell a redemption" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /ACRED/ }).first()).toBeVisible();

    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("BUY", { exact: true })).toBeVisible();
    await expect(page.getByText("You receive now")).toBeVisible();
    for (const term of ["Service fee", "Pool usage", "Waiting time", "Fund risk"]) {
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
  test("verdict stamp has the verdict word", async ({ page }) => {
    await page.goto("/sell");
    await page.getByLabel(/Amount in/).fill("0.01");
    const ticket = page.getByRole("region", { name: "Your sale" });
    await expect(ticket.getByText("BUY", { exact: true })).toBeVisible();
  });

  test("shows days skipped and the yearly cost", async ({ page }) => {
    await page.goto("/sell");
    await page.getByRole("radio", { name: /^ACRED,/ }).click();
    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText(/You skip \d+ days/)).toBeVisible();
    await expect(page.getByText(/a year/)).toBeVisible();
    await page.getByRole("radio", { name: /^ACREDd,/ }).click();
    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("Pays within a week")).toBeVisible();
    await expect(page.getByText(/a year/)).toHaveCount(0);
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
  test("demo controls hidden by default", async ({ page }) => {
    await page.goto("/status");
    await expect(page.getByRole("heading", { level: 1, name: "Oracle and risk" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Simulate issuer failure" })).toHaveCount(0);
  });

  test("issuer failure halts quotes and allows the writedown", async ({ page }) => {
    // Demo state lives in the tab, so move between screens with the app's own tabs.
    const tab = async (name: string) => {
      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) await menu.click();
      return page.getByRole("navigation", { name: "App sections" }).filter({ visible: true }).getByRole("link", { name, exact: true });
    };
    await page.goto("/status?operator");
    await page.getByLabel("Operator key").fill("mock");
    await page.getByRole("button", { name: "Unlock" }).click();
    await page.getByRole("button", { name: "Simulate issuer failure" }).click();
    await expect(page.getByText("Issuer status: FAILED")).toBeVisible();

    await (await tab("Sell a redemption")).click();
    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("HALT", { exact: true })).toBeVisible();
    await expect(page.getByText("Issuer reports failure")).toBeVisible();

    await (await tab("Oracle and risk")).click();
    await expect(page.getByRole("button", { name: "Mark impaired" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Restore issuer" }).click();
    await expect(page.getByText("Issuer status: OK")).toBeVisible();
  });
});

test.describe("Book", () => {
  test("lists open claims from the book API with Arkiv provenance", async ({ page }) => {
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: "Open claims" })).toBeVisible();
    await expect(page.getByText("Paid for them", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Arkiv entity" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Arc transaction" }).first()).toBeVisible();
    await expect(page.getByText(/Written to Arkiv Rabdi by/)).toBeVisible();
  });
});

test.describe("Site", () => {
  test("the app renders inside its shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".theme-app")).toHaveCount(0);
    await page.goto("/sell");
    await expect(page.locator(".theme-app")).toHaveCount(1);
  });
});
