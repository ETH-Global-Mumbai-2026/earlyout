import { expect, test } from "@playwright/test";

test.describe("Circle CCTP", () => {
  test("a seller gets paid on Base through the payout router", async ({ page }) => {
    await page.goto("/sell");
    await page.getByLabel(/Amount in/).fill("0.01");
    await expect(page.getByText("BUY", { exact: true })).toBeVisible();
    await page.getByRole("radiogroup", { name: "Get paid on" }).getByRole("radio", { name: "Base" }).click();
    await expect(page.getByText(/arrives on Base, after Circle's/)).toBeVisible();

    const sell = page.getByRole("button", { name: "Sell and get paid on Base" });
    await expect(sell).toBeEnabled();
    await sell.click();
    const sheet = page.getByRole("dialog", { name: "Sold" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("On its way to Base")).toBeVisible();
    await expect(sheet.getByText("Arrived on Base.")).toBeVisible();
    await expect(sheet.getByRole("link", { name: "View on Base" })).toHaveAttribute("href", /sepolia\.basescan\.org\/tx\/0x/);
  });

  test("an LP brings USDC from Base, then deposits it", async ({ page }) => {
    await page.goto("/vault");
    await expect(page.getByText("Bring USDC from another chain")).toBeVisible();
    await page.getByLabel(/USDC on Base/).fill("10");
    await expect(page.getByText(/arrives on Arc, after Circle's/)).toBeVisible();
    await page.getByRole("button", { name: "Send from Base" }).click();
    await expect(page.getByText(/arrived on Arc\./)).toBeVisible();
    await page.getByRole("button", { name: "Deposit it" }).click();
    await expect(page.getByLabel(/Deposit in USDC/)).toHaveValue("9.941471");
  });
});
