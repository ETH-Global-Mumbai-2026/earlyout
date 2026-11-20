import Link from "next/link";
import { GlassBackdrop } from "@/components/art/GlassBackdrop";
import { GLASS_BG } from "@/components/art/glass";
import { SiteFooter, SiteNav } from "@/components/site/SiteChrome";
import { buttonClass } from "@/components/ui/buttonClass";
import { COPY } from "@/lib/copy";

const C = COPY.notFound;

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className={`relative overflow-hidden ${GLASS_BG}`}>
        <GlassBackdrop />
        <div className="relative mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6">
          <div className="t-label !text-ink-2">404</div>
          <h1 className="t-hero mt-4 max-w-2xl">{C.title}</h1>
          <p className="t-lede mt-5 max-w-md !text-ink">{C.lede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className={buttonClass("primary", "lg")}>
              {C.home}
            </Link>
            <Link href="/sell" className={buttonClass("secondary", "lg")}>
              {C.app}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
