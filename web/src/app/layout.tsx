import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toolbar } from "@/components/Toolbar";
import { ConfigNotice } from "@/components/ConfigNotice";

export const metadata: Metadata = {
  title: "Earlyout",
  description: "Early exit for funds that redeem on a schedule.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Toolbar />
          <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-24">
            <ConfigNotice />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
