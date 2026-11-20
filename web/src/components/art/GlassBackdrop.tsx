"use client";

import { GlassFold } from "../ui/GlassFold";
import { useIsDark } from "../ThemeToggle";

type Glass = { color1: string; color2: string; color3: string; vignette: number; noise: number };

// Sky blue glass, one palette per theme.
const LIGHT: Glass = { color1: "#1688e0", color2: "#86c8f4", color3: "#ffffff", vignette: 0.3, noise: 0.05 };
const DARK: Glass = { color1: "#2a8fe0", color2: "#071a2c", color3: "#c9ecff", vignette: 0.45, noise: 0.08 };

// The wash is made from the page canvas colour, so it follows theme and palette.
// Class names are written out in full so Tailwind can see them.
const WASH = {
  // Text on the left: fade from the left edge (whole area on phones).
  left: "bg-[color-mix(in_srgb,var(--color-canvas)_55%,transparent)] lg:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-canvas)_80%,transparent)_0%,color-mix(in_srgb,var(--color-canvas)_32%,transparent)_45%,transparent_72%)]",
  // Text in the middle: a soft pool behind it.
  center: "bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--color-canvas)_75%,transparent)_0%,color-mix(in_srgb,var(--color-canvas)_32%,transparent)_45%,transparent_75%)]",
};

/// Animated glass behind a section (home hero, closing call to action,
/// audience page headers, 404, wallet welcome, sale receipt), plus a soft wash
/// where the text sits so it always reads. Follows the theme.
export function GlassBackdrop({ wash = "left" }: { wash?: keyof typeof WASH }) {
  const p = useIsDark() ? DARK : LIGHT;
  return (
    <>
      <GlassFold {...p} speed={0.3} scale={1} className="absolute inset-0" />
      <div aria-hidden className={`absolute inset-0 ${WASH[wash]}`} />
    </>
  );
}
