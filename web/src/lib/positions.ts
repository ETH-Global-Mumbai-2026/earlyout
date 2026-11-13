// Totals for a set of claims: what was paid, what they are worth at payout,
// and the difference. Pure, relative imports only.

export type ClaimFigures = { amount: string; usdcPaid: string; nav: string };

/// amount (18dp) × nav (18dp) → USDC (6dp).
export function valueAtPayout(c: ClaimFigures): bigint {
  return (BigInt(c.amount) * BigInt(c.nav)) / 10n ** 30n;
}

export function positionsSummary(claims: ClaimFigures[]): { cost: bigint; expected: bigint; profit: bigint } {
  let cost = 0n;
  let expected = 0n;
  for (const c of claims) {
    cost += BigInt(c.usdcPaid);
    expected += valueAtPayout(c);
  }
  return { cost, expected, profit: expected - cost };
}
