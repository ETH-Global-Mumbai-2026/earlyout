// Derived figures shown on quotes, positions and the hero. Times in seconds.
// Pure, relative imports only, so `node --test` can load it directly.

const HOUR = 3_600;
const DAY = 86_400;
const YEAR = 31_536_000;
const WEEK = 7 * DAY;

export type Skipped = { value: number; unit: "days" | "hours" | "minutes" };

/// How long a seller avoids waiting: whole days from one day up, else hours, else minutes (at least 1).
export function daysSkipped(settleAt: number, now: number): Skipped {
  const s = Math.max(0, settleAt - now);
  if (s >= DAY) return { value: Math.ceil(s / DAY), unit: "days" };
  if (s >= HOUR) return { value: Math.ceil(s / HOUR), unit: "hours" };
  return { value: Math.max(1, Math.ceil(s / 60)), unit: "minutes" };
}

/// Spread scaled to a year. Null under a week, where the figure misleads.
export function annualisedBps(spreadBps: number, secondsToPayout: number): number | null {
  if (secondsToPayout < WEEK) return null;
  return Math.round((spreadBps * YEAR) / secondsToPayout);
}

/// Profit from buying at `cost` and collecting `valueAtPayout`, both in USDC base units.
export function expectedReturn(
  cost: bigint,
  valueAtPayout: bigint,
  secondsToPayout: number,
): { profit: bigint; bps: number; annualisedBps: number | null } {
  const profit = valueAtPayout - cost;
  const bps = cost === 0n ? 0 : Number((profit * 10_000n) / cost);
  return { profit, bps, annualisedBps: annualisedBps(bps, secondsToPayout) };
}
