import type { Quote } from "./types.ts";

/// 0.001 of a unit: small enough that the testnet vault can buy it, so the
/// verdict is the real one. Figures are scaled up to one unit for display.
export const HERO_PROBE = 10n ** 15n;

/// A quote for `probe` units (18dp), restated per whole unit. Spread terms,
/// verdict, reason and dates do not depend on size and are kept as they are.
export function perUnitQuote(q: Quote, probe: bigint): Quote {
  const k = 10n ** 18n / probe;
  return { ...q, payout: q.payout * k, value: q.value * k, capacityLeft: q.capacityLeft * k };
}
