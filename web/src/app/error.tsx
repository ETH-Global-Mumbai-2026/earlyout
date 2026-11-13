"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GlassBackdrop } from "@/components/art/GlassBackdrop";
import { GLASS_BG } from "@/components/art/glass";
import { buttonClass } from "@/components/ui/buttonClass";
import { COPY } from "@/lib/copy";

const C = COPY.error;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className={`relative min-h-dvh overflow-hidden ${GLASS_BG}`}>
      <GlassBackdrop />
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-4 sm:px-6">
        <h1 className="t-hero max-w-2xl">{C.title}</h1>
        <p className="t-lede mt-5 max-w-md !text-ink">{C.lede}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
            {C.retry}
          </button>
          <Link href="/" className={buttonClass("secondary", "lg")}>
            {COPY.notFound.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
