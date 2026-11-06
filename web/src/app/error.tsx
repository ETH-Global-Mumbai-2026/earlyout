"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col justify-center px-5">
      <div className="t-eyebrow">Something went wrong</div>
      <h1 className="t-display mt-4">The page hit an error.</h1>
      <p className="t-lede mt-4">Your funds are not affected. Nothing is sent without your wallet&apos;s approval. Try again, or go back home.</p>
      <div className="mt-8 flex gap-3 text-[15px] font-medium">
        <button type="button" onClick={reset} className="pressable rounded-full bg-ink px-5 py-2.5 text-canvas">
          Try again
        </button>
        <Link href="/" className="pressable rounded-full border border-hairline px-5 py-2.5">
          Home
        </Link>
      </div>
    </main>
  );
}
