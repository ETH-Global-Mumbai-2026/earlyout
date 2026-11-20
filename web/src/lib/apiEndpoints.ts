// The public read API served by the app (web/src/app/api/*). Shown on the
// Platforms page, the Docs page and the app's API screen.

export type Endpoint = { method: "GET" | "POST"; path: string; purpose: string; example: string };

export const API_ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/state",
    purpose: "Every listed fund and the vault, read from Arc in one call.",
    example: "/api/state",
  },
  {
    method: "GET",
    path: "/api/quote",
    purpose: "The Vault's own quote for a fund and amount: verdict, reason, the four terms, payout.",
    example: "/api/quote?fund=0x8d9F…06F&amount=1000000000000000",
  },
  {
    method: "GET",
    path: "/api/account",
    purpose: "A wallet's USDC, fund token balances and vault position.",
    example: "/api/account?address=0x…",
  },
  {
    method: "GET",
    path: "/api/receipt",
    purpose: "Status and decoded logs of a transaction the wallet sent.",
    example: "/api/receipt?hash=0x…",
  },
  {
    method: "GET",
    path: "/api/book",
    purpose: "Open claims and the fund directory, read from Arkiv.",
    example: "/api/book",
  },
];
