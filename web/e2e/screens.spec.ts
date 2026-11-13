import { expect, test } from "@playwright/test";

test.describe("Screens", () => {
  test("positions show totals", async ({ page }) => {
    await page.goto("/positions");
    await expect(page.getByRole("heading", { level: 1, name: "Positions" })).toBeVisible();
    await expect(page.getByText("Expected at settlement")).toBeVisible();
    await expect(page.getByRole("table", { name: "Payouts the pool holds" }).getByText("ACRED", { exact: true }).first()).toBeVisible();
  });

  test("my sales lists the mock sales", async ({ page }) => {
    await page.goto("/sales");
    await expect(page.getByRole("heading", { level: 1, name: "My sales" })).toBeVisible();
    await expect(page.getByText("Waiting for payout").filter({ visible: true }).first()).toBeVisible();
  });

  test("api page offers request access", async ({ page }) => {
    await page.goto("/api-access");
    await expect(page.getByRole("heading", { level: 1, name: "API and keys" })).toBeVisible();
    const ask = page.getByRole("link", { name: "Request access" });
    await expect(ask).toHaveAttribute("href", /^mailto:.+subject=Earlyout%20API%20access/);
    await expect(page.getByText("/api/quote", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Example response" }).getByText('"verdict"')).toBeVisible();
  });

  test("buy takes a whole claim in mock mode", async ({ page }) => {
    await page.goto("/buy");
    await expect(page.getByRole("heading", { level: 1, name: "Buy a claim" })).toBeVisible();
    const open = page.getByRole("radiogroup", { name: "Claims for sale" });
    const first = open.getByRole("radio").first();
    await expect(first).toBeVisible();
    const name = await first.getAttribute("aria-label");
    const before = await open.getByRole("radio").count();
    await first.click();
    const buy = page.getByRole("button", { name: /^Buy for \$/ });
    await expect(buy).toBeEnabled();
    await buy.click();
    const yours = page.getByRole("region", { name: "Your claims" });
    await expect(yours.getByRole("button", { name: "Redeem" }).filter({ visible: true })).toHaveCount(1);
    await expect(open.getByRole("radio")).toHaveCount(before - 1);
    await expect(open.getByRole("radio", { name: name! })).toHaveCount(0);
  });

  test("dialogs keep focus while typing, trap Tab and close on Escape", async ({ page }) => {
    await page.goto("/status?operator");
    const key = page.getByLabel("Operator key");
    await key.click();
    await key.pressSequentially("abcd", { delay: 30 });
    await expect(key).toHaveValue("abcd");
    await expect(key).toBeFocused();
    const dialog = page.getByRole("dialog");
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement)), "focus stays inside the dialog").toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  for (const [path, title] of [
    ["/sales", "No sales yet."],
    ["/positions", "The vault holds no claims right now."],
    ["/book", "No open claims."],
    ["/buy", "Nothing to buy right now."],
  ] as const) {
    test(`${path} shows its empty state when the list is empty`, async ({ page }) => {
      await page.goto(`${path}?empty`);
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    });
  }
});
