import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/// Share card: the mark, the promise, and a dithered field drawn as dots.
export default function OpenGraphImage() {
  const dots: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 22; i++) {
    for (let j = 0; j < 26; j++) {
      const x = 640 + j * 22;
      const y = 20 + i * 28;
      const wave = Math.sin(j * 0.45 + i * 0.32) + Math.cos(i * 0.21 - j * 0.18);
      if (wave > 0.35) dots.push({ x, y, r: wave > 1.1 ? 5 : 3 });
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#000", color: "#F5F5F7", position: "relative" }}>
        <svg width="1200" height="630" style={{ position: "absolute", left: 0, top: 0 }}>
          {dots.map((d, k) => (
            <rect key={k} x={d.x} y={d.y} width={d.r * 2} height={d.r * 2} fill="#FF66CC" />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px", width: "640px", height: "630px", background: "#000" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#18181A" />
              <path d="M20.55 11.41A8 8 0 1 0 20.55 20.59" stroke="#F5F5F7" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M14 16V11" stroke="#F5F5F7" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M14 16H26.5M23.4 12.9L26.5 16L23.4 19.1" stroke="#FF66CC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="16" r="1.6" fill="#FF66CC" />
            </svg>
            <div style={{ fontSize: 34, fontFamily: "monospace", display: "flex" }}>
              Earlyout<span style={{ color: "#FF66CC" }}>.</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-1.5px" }}>{SITE_TAGLINE}</div>
            <div style={{ fontSize: 23, color: "#8E8E93", lineHeight: 1.4 }}>
              Sell a pending fund redemption today, in USDC on Arc, at real NAV minus a spread that names its four reasons.
            </div>
          </div>
          <div style={{ display: "flex", gap: "28px", fontSize: 20, fontFamily: "monospace", color: "#8E8E93" }}>
            <span>ARC</span>
            <span>CHAINLINK CRE</span>
            <span>ARKIV</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
