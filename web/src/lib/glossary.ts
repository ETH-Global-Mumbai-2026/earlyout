/// Full forms for every abbreviation the product uses, and the funds it can price.
/// One source, so the site, the app and the tooltips say the same thing.

export const GLOSSARY = {
  NAV: { full: "Net asset value", say: "What one fund unit is worth, published by the fund." },
  USDC: { full: "USD Coin", say: "A dollar stablecoin issued by Circle. Arc uses it for gas too." },
  CRE: { full: "Chainlink Runtime Environment", say: "Runs our workflow across Chainlink nodes and signs what they agree on." },
  LP: { full: "Liquidity provider", say: "Someone who deposits USDC into the vault and earns the spread." },
  CLO: { full: "Collateralized loan obligation", say: "A pool of corporate loans split into rated slices; AAA is the safest slice." },
  bps: { full: "Basis points", say: "Hundredths of a percent: 100 bps is 1%." },
  "ERC-1155": { full: "Ethereum token standard 1155", say: "One contract holding many token types; each claim is its own type." },
  "ERC-4626": { full: "Ethereum tokenized vault standard", say: "A shared interface for vaults: deposit assets, receive shares." },
  API: { full: "Application programming interface", say: "An address that software calls to get data." },
  "T-bill": { full: "US Treasury bill", say: "Short-term US government debt." },
} as const;

export type Term = keyof typeof GLOSSARY;

export type CatalogFund = {
  symbol: string;
  name: string;
  issuer: string;
  holds: string;
  feed: `0x${string}`; // Chainlink NAV feed on Ethereum mainnet
};

/// Funds with a Chainlink NAV feed on Ethereum mainnet that Earlyout lists on Arc.
/// The tokens on Arc are stand-ins; the NAV is the real feed.
export const CATALOG: CatalogFund[] = [
  { symbol: "ACRED", name: "Apollo Diversified Credit Securitize Fund", issuer: "Apollo, via Securitize", holds: "Private credit", feed: "0x35DDfB90011E686CCf837a6819562705076207EB" },
  { symbol: "JAAA", name: "Janus Henderson Anemoy AAA CLO Fund", issuer: "Janus Henderson, via Centrifuge", holds: "AAA-rated CLOs", feed: "0x3BbccB2301759D2e4A5692bA72DAb4b75dC43B1a" },
  { symbol: "JTRSY", name: "Janus Henderson Anemoy Treasury Fund", issuer: "Janus Henderson, via Centrifuge", holds: "US T-bills", feed: "0x0C2e4Df738e99e8db80012f5bb2a303f3f48Ca74" },
  { symbol: "USTB", name: "Superstate Short Duration US Government Securities Fund", issuer: "Superstate", holds: "US government securities", feed: "0x289B5036cd942e619E1Ee48670F98d214E745AAC" },
  { symbol: "USCC", name: "Superstate Crypto Carry Fund", issuer: "Superstate", holds: "Crypto basis trade", feed: "0xAfFd8F5578E8590665de561bdE9E7BAdb99300d9" },
  { symbol: "USTBL", name: "Spiko US T-Bills Money Market Fund", issuer: "Spiko", holds: "US T-bills", feed: "0x477e363c51Ab0C4D13B22CD6B57D56d4a3Cb7Abe" },
  { symbol: "SAFO", name: "Spiko Amundi Overnight Swap Fund", issuer: "Spiko with Amundi", holds: "Overnight rate swaps", feed: "0xC1E5FA6d48ba11cA163b03f2aBf843471eB7B2fB" },
  { symbol: "CASH+", name: "Asseto CASH+ Money Market Fund", issuer: "Asseto", holds: "Money market instruments", feed: "0x66C0dB1A21047f0c156d2F39b33B1A47E9fE4583" },
  { symbol: "Treasury+", name: "EPOCH Treasury+ Fund", issuer: "EPOCH", holds: "US Treasuries", feed: "0x0c829741d2D2e2536FA1D59E283c8771516fE0cd" },
];

/// Earlyout buys pending redemptions in funds that pay out on a schedule.
/// Funds that already pay within days are shown for comparison only.
const SCHEDULED = new Set(["ACRED", "ACREDd"]);
export function isScheduled(symbol: string): boolean {
  return SCHEDULED.has(symbol);
}

export function catalogFor(symbol: string): CatalogFund | undefined {
  return CATALOG.find((c) => c.symbol === symbol) ?? (symbol === "ACREDd" ? CATALOG[0] : undefined);
}

/// On-chain names end in "(stand-in)"; the table says that once, not on every row.
export function displayName(name: string): string {
  return name.replace(/\s*\(stand-in\)\s*$/i, "");
}
