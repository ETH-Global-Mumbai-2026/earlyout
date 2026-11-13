/// Funds that reuse another fund's logo: ACREDd is ACRED with a short demo window.
const ALIAS: Record<string, string> = { ACREDd: "ACRED" };

/// The file under /public/funds that holds a fund's issuer logo.
export function fundLogoFile(symbol: string): string {
  const s = ALIAS[symbol] ?? symbol;
  return `${s.toLowerCase().replace(/\+/g, "-plus")}.svg`;
}
