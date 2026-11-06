import Link from "next/link";
import { ShaderPanel } from "@/components/ShaderPanel";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="t-eyebrow">404 · Not found</div>
          <h1 className="t-hero mt-5 max-w-lg">This page settled early.</h1>
          <p className="t-lede mt-5 max-w-md">The address does not match anything on Earlyout. The app and the company pages are one click away.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-[15px] font-medium">
            <Link href="/" className="pressable rounded-full bg-ink px-5 py-2.5 text-canvas">
              Home
            </Link>
            <Link href="/sell" className="pressable rounded-full border border-hairline px-5 py-2.5">
              Open the app
            </Link>
          </div>
        </div>
        <ShaderPanel shape="ripple" className="h-[40vh] border-t border-hairline lg:h-auto lg:border-l lg:border-t-0" />
      </main>
      <SiteFooter />
    </>
  );
}
