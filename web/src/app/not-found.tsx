import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto flex min-h-[60dvh] max-w-6xl flex-col justify-center px-5 py-24 sm:px-8">
        <div className="text-[13px] font-semibold text-accent">404</div>
        <h1 className="t-hero mt-3 max-w-xl">This page does not exist.</h1>
        <p className="t-lede mt-4 max-w-md">The address does not match anything on Earlyout.</p>
        <div className="mt-8 flex flex-wrap gap-3 text-[15px] font-medium">
          <Link href="/" className="pressable rounded-md bg-accent px-5 py-2.5 text-accent-ink">
            Home
          </Link>
          <Link href="/sell" className="pressable rounded-md border border-line-strong px-5 py-2.5 text-ink-2">
            Launch app
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
