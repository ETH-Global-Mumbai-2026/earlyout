// Screenshot sweep for visual review: every public route at four sizes, light
// and dark. Not part of CI. Start the app first (the Playwright server runs on
// 3100), then:
//   SCREENS_OUT=/some/folder node --experimental-strip-types scripts/screens.ts
// Optional: SCREENS_BASE (default http://127.0.0.1:3100), SCREENS_ROUTES=/,/sell
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { PUBLIC_ROUTES } from "../src/lib/site.ts";

const SIZES = {
  small: { width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 810, height: 1080, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  laptop: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
} as const;
const THEMES = ["light", "dark"] as const;

const out = process.env.SCREENS_OUT;
if (!out) throw new Error("Set SCREENS_OUT to the folder for the PNGs");
const base = process.env.SCREENS_BASE ?? "http://127.0.0.1:3100";
const routes = process.env.SCREENS_ROUTES ? process.env.SCREENS_ROUTES.split(",") : [...PUBLIC_ROUTES, "/missing-page"];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let n = 0;
for (const [size, s] of Object.entries(SIZES)) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: s.width, height: s.height },
      isMobile: s.isMobile,
      hasTouch: s.hasTouch,
      deviceScaleFactor: s.deviceScaleFactor,
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await ctx.newPage();
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      // Let scroll reveals run so the whole page is in its settled state.
      const h = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < h; y += s.height / 2) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(150);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      const name = `${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}__${size}__${theme}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
      n++;
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`${n} screenshots in ${out}`);
