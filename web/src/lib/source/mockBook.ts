/// Sample book for NEXT_PUBLIC_MODE=mock, shaped like /api/book in chain mode.
export function mockBook() {
  const now = Math.floor(Date.now() / 1000);
  const nav = (1113_7732n * 10n ** 14n).toString();
  const claim = (i: number, symbol: string, settleAt: number, amount: bigint, paid: bigint) => ({
    key: `0x${(0xabc0 + i).toString(16).padStart(64, "0")}`,
    claimId: `0x${(0x1000 + i).toString(16).padStart(64, "0")}`,
    fund: symbol === "ACRED" ? "0x000000000000000000000000000000000000a11a" : "0x000000000000000000000000000000000000a11b",
    symbol,
    settleAt,
    status: "open",
    amount: amount.toString(),
    usdcPaid: paid.toString(),
    nav,
    baseBps: 50,
    utilBps: 12,
    timeBps: symbol === "ACRED" ? 397 : 4,
    creditBps: 150,
    seller: "0x000000000000000000000000000000000000d3b0",
    holder: "0x00000000000000000000000000000000000000ab",
    txHash: `0x${(0x5555 + i).toString(16).padStart(64, "0")}`,
    soldAt: now - 600 * i,
    expiresAt: settleAt,
    owner: "0x343F684dAFFf216CDf38a40888662148eBa07Fd7",
  });
  return {
    claims: [
      claim(1, "ACREDd", now + 11 * 60, 5n * 10n ** 17n, 5_558_000n),
      claim(2, "ACRED", now + 89 * 86400, 10n ** 16n, 10_470_000n),
      claim(3, "ACRED", now + 89 * 86400, 2n * 10n ** 16n, 20_930_000n),
    ],
    funds: [],
    writer: "0x343F684dAFFf216CDf38a40888662148eBa07Fd7",
    explorer: "https://rabdi.explorer.arkiv.network",
    source: "mock",
  };
}
