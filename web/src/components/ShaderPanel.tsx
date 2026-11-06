"use client";

import { Dithering } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme";

export type ShaderShape = "simplex" | "warp" | "dots" | "wave" | "ripple" | "swirl" | "sphere";
export type ShaderTone = "ok" | "halt";

/// The dithered panel from the reference layout. Its colour carries state:
/// accent while every issuer reports OK, red when one reports failure.
export function ShaderPanel({
  shape = "warp",
  tone = "ok",
  className,
  caption,
}: {
  shape?: ShaderShape;
  tone?: ShaderTone;
  className?: string;
  caption?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const reduce = useReducedMotion();
  const dark = theme === "dark";
  const front =
    tone === "halt" ? (dark ? "hsl(3, 100%, 62%)" : "hsl(3, 85%, 52%)") : dark ? "hsl(320, 100%, 70%)" : "hsl(220, 100%, 62%)";

  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden={!caption}>
      <Dithering
        style={{ height: "100%", width: "100%" }}
        colorBack={dark ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 95%)"}
        colorFront={front}
        shape={shape}
        type="4x4"
        pxSize={3}
        offsetX={0}
        offsetY={0}
        scale={0.8}
        rotation={0}
        speed={reduce ? 0 : 0.1}
      />
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
          <div className="material inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-hairline px-3.5 py-1.5 text-xs font-medium tnum text-ink">
            {caption}
          </div>
        </div>
      )}
    </div>
  );
}
