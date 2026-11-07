import { formatUnits, parseUnits } from "viem";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usd4 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

export function fmtUsdc(v: bigint, precise = false) {
  const n = Number(formatUnits(v, 6));
  return precise ? usd4.format(n) : usd.format(n);
}

export function fmtNav(nav18: bigint) {
  return usd4.format(Number(formatUnits(nav18, 18)));
}

export function fmtUnits(v: bigint, decimals = 18) {
  return num.format(Number(formatUnits(v, decimals)));
}

export function parseUnitsSafe(s: string, decimals: number): bigint | null {
  const t = s.trim();
  if (t === "" || !/^\d*\.?\d*$/.test(t) || t === ".") return null;
  try {
    return parseUnits(t, decimals);
  } catch {
    return null;
  }
}

export function fmtBps(bps: number) {
  return `${(bps / 100).toFixed(2)}%`;
}

export function fmtDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(unixSeconds: number, now = Date.now() / 1000) {
  const s = Math.max(0, Math.floor(now - unixSeconds));
  if (s < 60) return `${s}s ago`;
  // Rounded the same way as fmtDuration, so "10 hours of 4 days" and "10 h ago" agree.
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function timeUntil(unixSeconds: number, now = Date.now() / 1000) {
  const s = Math.max(0, Math.floor(unixSeconds - now));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} days`;
}

export function shortAddr(a: string) {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/// A duration in plain words: "15 min", "1 day", "90 days".
export function fmtDuration(seconds: number) {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = Math.round(seconds / 86400);
  return `${d} ${d === 1 ? "day" : "days"}`;
}
