// The app's sections, grouped by audience. Labels match the screens' h1s.

export type NavGroup = "Holders" | "Liquidity" | "Market" | "Platforms";

export const APP_NAV: { group: NavGroup; items: { href: string; label: string }[] }[] = [
  {
    group: "Holders",
    items: [
      { href: "/sell", label: "Sell a redemption" },
      { href: "/sales", label: "My sales" },
    ],
  },
  {
    group: "Liquidity",
    items: [
      { href: "/vault", label: "Vault" },
      { href: "/positions", label: "Positions" },
    ],
  },
  {
    group: "Market",
    items: [
      { href: "/book", label: "Open claims" },
      { href: "/buy", label: "Buy a claim" },
      { href: "/status", label: "Oracle and risk" },
    ],
  },
  {
    group: "Platforms",
    items: [{ href: "/api-access", label: "API and keys" }],
  },
];

/// The nav group a path belongs to, for the market strip's scope.
export function groupFor(path: string): NavGroup {
  for (const g of APP_NAV) if (g.items.some((i) => path === i.href || path.startsWith(`${i.href}/`))) return g.group;
  return "Holders";
}
