import type { ReactNode } from "react";
import { Reveal } from "./motion/Reveal";

/// Every app screen opens by saying what it is for, in one sentence.
export function AppHeader({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Reveal y={8} className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="t-page">{title}</h1>
        <p className="mt-2 text-[15px] leading-snug text-ink-2">{children}</p>
      </div>
      {aside}
    </Reveal>
  );
}
