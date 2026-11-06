import type { Fund, VaultState } from "./types";
import { roundUpToWindow } from "./types";

const YEAR = 365 * 86400;

/// The Vault's quote formula, evaluated in the browser for the funds table.
/// Base and vault-usage terms are vault-wide, so one live quote supplies them;
/// the rest comes from each fund's terms. Saves one RPC call per row.
export function indicativeBid(f: Fund, now: number, market: { baseBps: number; utilBps: number }) {
  const settleAt = roundUpToWindow(now + f.settlementDelay, f.window);
  const secs = Math.max(0, settleAt - now);
  const timeBps = Math.min(65_535, Math.floor(f.volBps * Math.sqrt(secs / YEAR)));
  const spreadBps = market.baseBps + market.utilBps + timeBps + f.creditBps;
  const navUsdc = f.nav / 10n ** 12n; // 18dp NAV to 6dp USDC per unit
  const perUnit = spreadBps >= 10_000 ? 0n : (navUsdc * BigInt(10_000 - spreadBps)) / 10_000n;
  return { spreadBps, perUnit };
}

/// Vault-wide terms, same arithmetic as Vault.sol: base, plus the usage slope
/// scaled by the share of assets already deployed.
export function marketFrom(v: VaultState | undefined) {
  if (!v) return undefined;
  const utilBps = v.totalAssets === 0n ? 0 : Number((BigInt(v.utilSlopeBps) * v.deployed) / v.totalAssets);
  return { baseBps: v.baseBps, utilBps };
}
