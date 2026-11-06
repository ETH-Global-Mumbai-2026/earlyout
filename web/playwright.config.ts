import { defineConfig, devices } from "@playwright/test";

/// Runs the app in mock mode so the flows are checked without a chain.
/// Set E2E_BASE_URL to test a server you started yourself.
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start -p 3100",
        url: baseURL,
        env: { NEXT_PUBLIC_MODE: "mock" },
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
