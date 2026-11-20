import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0b1b2b";
const PAPER = "#eef7fd";
const SHEET = "#fbfdff";
const RULE = "#cfe3f2";
const MUTED = "#557089";
const GREEN = "#0e7fd6";
const NEG = "#8b3a1e";

/// A Google font as TTF for the image renderer.
async function font(query: string): Promise<ArrayBuffer> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${query}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  if (!url) throw new Error(`Font not found: ${query}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

/// Share card: the promise on paper, and a term sheet with its stamp.
export default async function OpenGraphImage() {
  const [roman, italic, sans, sansBold, mono] = await Promise.all([
    font("Instrument+Serif:ital@0"),
    font("Instrument+Serif:ital@1"),
    font("Geist:wght@400"),
    font("Geist:wght@600"),
    font("Geist+Mono:wght@400"),
  ]);
  const lines: [string, string, boolean][] = [
    ["Value at NAV", "$1,112.89", false],
    ["Base", "-0.50%", true],
    ["Vault usage", "-0.58%", true],
    ["Time to payout", "-3.97%", true],
    ["Issuer credit", "-1.50%", true],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, color: INK, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 64px 60px", width: "640px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
              <path d="M22.4 10.6A9 9 0 1 0 22.4 21.4" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
              <path d="M14.5 16V10.25" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
              <path d="M14.5 16H28.5M25.25 12.75L28.5 16L25.25 19.25" stroke={GREEN} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.5px" }}>Earlyout</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div style={{ fontSize: 80, lineHeight: 0.98, letterSpacing: "-2px", fontFamily: "Instrument Serif", display: "flex", flexDirection: "column" }}>
              <span>Your redemption,</span>
              <span style={{ color: GREEN, fontStyle: "italic" }}>paid today.</span>
            </div>
            <div style={{ fontSize: 22, color: MUTED, lineHeight: 1.45 }}>Sell a pending fund redemption for USDC now, at the fund&apos;s real NAV minus a spread that names its reasons.</div>
          </div>
          <div style={{ display: "flex", gap: "26px", fontSize: 17, fontFamily: "Geist Mono", color: MUTED, letterSpacing: "2px" }}>
            <span>USDC ON ARC</span>
            <span>NAV BY CHAINLINK</span>
            <span>BOOK ON ARKIV</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${RULE}` }}>
          <div style={{ display: "flex", flexDirection: "column", width: "400px", background: SHEET, border: `1px solid ${RULE}`, borderRadius: "4px", padding: "26px 28px", position: "relative", boxShadow: "0 30px 60px -30px rgba(40,30,10,.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Geist Mono", fontSize: 14, color: MUTED, letterSpacing: "1px" }}>
              <span>QUOTE · ACRED · 1 UNIT</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: "12px" }}>
              {lines.map(([k, v, neg]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px dashed ${RULE}`, fontSize: 19 }}>
                  <span>{k}</span>
                  <span style={{ color: neg ? NEG : INK }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "18px" }}>
              <span style={{ fontSize: 17, color: MUTED, whiteSpace: "nowrap" }}>You receive today</span>
              <span style={{ fontSize: 50, fontFamily: "Instrument Serif", letterSpacing: "-1px" }}>$1,039.99</span>
            </div>
            <div style={{ position: "absolute", top: "-16px", right: "22px", display: "flex", border: `2px solid ${GREEN}`, color: GREEN, background: SHEET, fontFamily: "Geist Mono", fontSize: 16, letterSpacing: "3px", padding: "3px 10px", borderRadius: "3px", transform: "rotate(7deg)" }}>BUY</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: roman, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: italic, style: "italic", weight: 400 },
        { name: "Geist", data: sans, style: "normal", weight: 400 },
        { name: "Geist", data: sansBold, style: "normal", weight: 600 },
        { name: "Geist Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
