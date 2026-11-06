import type { Fund } from "./types";

function short(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

/// Curve labels for the selected fund and the 90-day ACRED reference only.
/// Ten funds on one curve would stack their labels on top of each other.
export function curveMarks(funds: Fund[], selected?: Fund) {
  const ref = funds.find((f) => f.symbol === "ACRED");
  const picked = [selected, ref].filter((f, i, a): f is Fund => !!f && a.findIndex((g) => g?.address === f.address) === i);
  return picked.map((f) => ({ days: f.settlementDelay / 86400, label: `${f.symbol} ${short(f.settlementDelay)}` }));
}
