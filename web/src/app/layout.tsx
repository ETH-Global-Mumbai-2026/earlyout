import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { themeScript } from "@/components/ThemeToggle";
import { Providers } from "@/components/Providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const averta = localFont({
  src: [
    { path: "./fonts/averta-light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/averta-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/averta-semibold.woff2", weight: "500", style: "normal" },
    { path: "./fonts/averta-semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/averta-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-averta",
  display: "swap",
  // Averta's own metrics leave more room above the letters than below, so
  // centred labels sat low. Same total line height, capitals centred.
  declarations: [
    { prop: "ascent-override", value: "100.4%" },
    { prop: "descent-override", value: "29.4%" },
    { prop: "line-gap-override", value: "0%" },
  ],
  fallback: ["-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["tokenized funds", "redemption", "private credit", "liquidity", "USDC", "Arc", "Chainlink CRE", "Arkiv", "ACRED"],
  authors: [{ name: "The Earlyout team", url: "https://github.com/ETH-Global-Mumbai-2026/earlyout" }],
  creator: "The Earlyout team",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={averta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
