// Shared by server and client components, so it lives outside the
// "use client" GlassBackdrop module (a client module's exports reach server
// components as references, not values).

/// Background colour the glass sits on before WebGL paints; set per theme and
/// palette in globals.css.
export const GLASS_BG = "bg-[var(--color-glass-bg)]";
