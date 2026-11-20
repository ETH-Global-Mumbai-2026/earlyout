"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HeroDoors, type Door } from "./HeroDoors";
import { HeroQuote } from "./HeroQuote";
import { buttonClass } from "../ui/primitives";
import { COPY } from "@/lib/copy";

const H = COPY.home.hero;

/// Direction A: the copy on the left, the live quote sheet on the right.
export function Hero() {
  const [door, setDoor] = useState<Door>("holder");
  const [changed, setChanged] = useState(false);
  const cta = H.doors[door];
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:min-h-[calc(100svh-84px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-8">
      <div className="min-w-0 text-ink">
        <div className="t-label !text-ink-2">{H.kicker}</div>
        <h1 className="t-hero mt-5">
          {H.title} <em className="italic text-brand">{H.titleItalic}</em>
        </h1>
        <p className="t-lede mt-6 max-w-xl !text-ink">{H.lede}</p>
        <div className="mt-8 [&_[aria-checked=false]]:!text-ink-2 [&_[aria-checked=true]]:!text-ink [&_[role=radiogroup]]:!bg-white/45 [&_[role=radiogroup]]:backdrop-blur-sm [&_[role=radio]>span.absolute]:!bg-white/90 dark:[&_[role=radiogroup]]:!bg-white/10 dark:[&_[role=radio]>span.absolute]:!bg-white/20 [&_[role=radio]>span.absolute]:!shadow-none">
          <HeroDoors
            value={door}
            onChange={(d) => {
              setDoor(d);
              setChanged(true);
            }}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href={cta.href} className={buttonClass("primary", "lg")}>
            {cta.cta}
          </Link>
          <Link href="/holders" className="inline-flex items-center gap-0.5 text-[14px] text-ink hover:underline">
            {H.secondary} <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
      <div className="relative grid min-w-0 place-items-center [&_.t-caption]:!text-ink-2">
        <div className="relative flex min-h-[470px] w-full max-w-[480px] flex-col justify-center">
          <HeroQuote door={door} replay={changed} />
        </div>
      </div>
    </section>
  );
}
