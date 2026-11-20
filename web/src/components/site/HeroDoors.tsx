"use client";

import { Segmented } from "../ui/primitives";
import { COPY } from "@/lib/copy";

export type Door = "holder" | "lp" | "platform";

const D = COPY.home.hero.doors;

/// The three ways in: holder, liquidity provider, platform.
export function HeroDoors({ value, onChange }: { value: Door; onChange: (d: Door) => void }) {
  return (
    <Segmented
      label={COPY.home.hero.doorsLabel}
      value={value}
      onChange={onChange}
      options={[
        { value: "holder", label: D.holder.label },
        { value: "lp", label: D.lp.label },
        { value: "platform", label: D.platform.label },
      ]}
    />
  );
}
