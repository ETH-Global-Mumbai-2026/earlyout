# 04. Pricing

The seller receives the claim's value at NAV, minus a spread made of four named terms. All four terms are returned by the contract and shown before the seller signs.

```
value  = amount × NAV                      (USDC, 6dp)
spread = base + vault usage + time + credit   (bps)
payout = value × (10,000 − spread) / 10,000
```

The formula lives in `Vault._quote` (`contracts/src/Vault.sol`). The browser never computes the price it charges: the sell screen shows `Vault.quoteFund` through `/api/quote`, and `sell` re-runs the quote on chain in the same transaction.

## The four terms

| Term | Field | Formula in the contract | Set by |
|---|---|---|---|
| Base | `baseBps` | `registry.baseBps()` | FundRegistry global |
| Vault usage | `utilBps` | `utilSlopeBps × deployedUsdc / totalAssets()` (0 when total assets are 0) | FundRegistry global slope, vault state |
| Time to payout | `timeBps` | `volBps × sqrt(secondsToPayout × 1e18 / YEAR) / 1e9`, with `YEAR = 365 days` | Per-fund `volBps` |
| Issuer credit | `creditBps` | `terms.creditBps` | Per fund |

Notes:

- **Time** is volatility × √(years to payout). `Math.sqrt` is OpenZeppelin's integer square root on a value scaled by 1e18, so the result is scaled by 1e9 and divided back out. Every step rounds down.
- **Seconds to payout** is `settleAt − block.timestamp`, where `settleAt = roundUp(block.timestamp + settlementDelay, window)`. A window of 1 day means a 90-day fund pays between 90 and 91 days out depending on the time of day.
- **Vault usage** rises as more of the vault's assets are tied up in claims, so the vault charges more as it fills. It uses the vault-wide `deployedUsdc`, not the fund's.
- Each term is clamped to `uint16` (65,535 bps) by `_toBps`. If the total reaches 10,000 bps the payout is zero and the verdict is REFUSE ("Spread too wide").
- The spread terms do not depend on the sale amount, except through the vault-usage term after the sale lands.

## Decimals

| Quantity | Decimals | Notes |
|---|---|---|
| Fund and claim amounts | 18 | The contracts assume every listed fund token has 18 decimals; nothing checks it |
| NAV in NavOracle | 18 | Normalised on write from the feed's decimals (6, 8 or 18 for the current feeds) |
| USDC (`payout`, `capacityLeft`, caps, costs) | 6 | |
| Arc native gas balance | 18 | Also USDC; never used for accounting |

So `value = amount × nav / 1e30`: 18 + 18 − 30 = 6 decimals. The same expression prices the issuer's payout in `IssuerStub.settle`.

## Parameters per fund

Global terms: `baseBps = 50`, `utilSlopeBps = 300`. Per-fund terms as read from FundRegistry on Arc testnet on 13 November 2026:

| Fund | Delay | Window | maxAge | volBps | creditBps | recoveryBps | Cap (USDC) | Offered in app |
|---|---|---|---|---|---|---|---|---|
| ACRED | 90 days | 1 day | 96 h | 800 | 150 | 4000 | 20 | Yes |
| ACREDd | 15 min | 5 min | 96 h | 800 | 150 | 4000 | 20 | Yes |
| JAAA | 7 days | 1 day | 96 h | 300 | 100 | 8000 | 20 | Yes |
| USCC | 3 days | 1 day | 96 h | 800 | 100 | 7000 | 20 | Yes |
| JTRSY | 1 day | 1 h | 96 h | 50 | 25 | 9500 | 20 | No |
| USTB | 1 day | 1 h | 96 h | 50 | 25 | 9500 | 20 | No |
| USTBL | 1 day | 1 h | 96 h | 50 | 25 | 9500 | 20 | No |
| SAFO | 1 day | 1 h | 96 h | 50 | 25 | 9500 | 20 | No |
| CASH+ | 1 day | 1 h | 96 h | 50 | 50 | 9000 | 20 | No |
| Treasury+ | 1 day | 1 h | 96 h | 50 | 50 | 9000 | 20 | No |

The 96-hour `maxAge` comes from the original spec: the feeds have 24 to 27 hour heartbeats and may skip weekends, so a tighter limit (for example 26 hours) would halt every Monday.

Time term at the nominal delay, for reference:

| Fund | Seconds to payout | timeBps |
|---|---|---|
| ACRED | 90 days | 397 (399 at 91 days) |
| JAAA | 7 days | 41 |
| USCC | 3 days | 72 |
| ACREDd | 15 minutes | 4 |

## Worked example

ACRED, 0.001 units, using the live state on 13 November 2026 and assuming exactly 90 days to payout.

| Input | Value |
|---|---|
| amount | `1e15` (0.001 units, 18dp) |
| NAV | `1112612770000000000000` (1,112.61277 USDC, 18dp) |
| vault `deployedUsdc` / `totalAssets` | 1,364,062 / 7,040,530 (1.364062 / 7.040530 USDC) |

| Step | Calculation | Result |
|---|---|---|
| base | global | 50 bps |
| vault usage | 300 × 1,364,062 / 7,040,530 = 58.12, rounded down | 58 bps |
| time | 800 × √(90 / 365) = 800 × 0.49656 = 397.25, rounded down | 397 bps |
| credit | ACRED terms | 150 bps |
| spread | 50 + 58 + 397 + 150 | 655 bps (6.55%) |
| value | 1e15 × 1112612770000000000000 / 1e30 | 1,112,612 (1.112612 USDC) |
| payout | 1,112,612 × 9,345 / 10,000, rounded down | 1,039,735 (1.039735 USDC) |
| minPayout set by the app | payout × 995 / 1,000 | 1,034,536 (1.034536 USDC) |

Scaled to one whole unit the payout would be 1,039.736633 USDC against a value of 1,112.612770 USDC, but a whole unit would REFUSE on the testnet vault: it exceeds both the 20 USDC cap and the vault's idle USDC. That is why the site's hero quotes 0.001 units and scales the figures (`HERO_PROBE` and `perUnitQuote` in `web/src/lib/perUnit.ts`); the verdict shown is the real one for 0.001 units.

The `web/test/smoke.test.ts` unit test uses the same four terms (50 + 58 + 397 + 150 = 655).

## Capacity

`capacityLeft = exposureCapUsdc − fundCost[fund]` (or 0). A sale whose payout would push `fundCost[fund]` over the cap returns REFUSE "Over the fund cap". Separately, the payout must fit in the vault's idle USDC, or REFUSE "Vault short of USDC".

## Buyer price

A buyer who takes a claim the vault holds (`Vault.buy`) pays `buyPrice`:

```
buyPrice = amount × NAV / 1e30 × (10,000 − (time + credit)) / 10,000
```

Only the time term (for the time left) and the credit term apply. Base and vault usage are not charged to a buyer, so the vault sells a claim for more than it would pay for a fresh one with the same time left. The buyer collects full NAV at payout through `ClaimWrapper.redeem`. Buying reverts only on HALT; REFUSE conditions such as the cap do not block it. The Buy screen is not live yet (see [11-roadmap.md](11-roadmap.md)).

## Where the web app computes prices itself

`indicativeBid` in `web/src/lib/pricing.ts` re-implements the formula in the browser to fill the funds table (bid per unit for every fund) without one RPC call per row. It takes the base and usage terms from the vault state (`marketFrom`) and uses floating-point `Math.sqrt`, so it can differ from the contract by a basis point. It is display only.

`web/src/lib/source/mock.ts` uses the same integer formula as the contract so mock mode behaves like the chain. Its verdict list is shorter than the contract's (it has no "Claim is already due", "Spread too wide" or "Fund not listed" checks).

Derived figures in `web/src/lib/metrics.ts` (redesign branch, unit tested):

| Helper | Meaning |
|---|---|
| `daysSkipped(settleAt, now)` | How long the seller avoids waiting, in days, else hours, else minutes |
| `annualisedBps(spreadBps, secondsToPayout)` | Spread × (one year ÷ time to payout); `null` under 7 days |
| `expectedReturn(cost, valueAtPayout, secondsToPayout)` | Profit in USDC, bps and annualised, for LPs and buyers |

## Where the LP earns

The vault pays `payout` and collects `value` (at the NAV current on collection day) at settlement. The difference, the spread, is LP profit. It accrues linearly inside `totalAssets()` from the sale to the payout date, so a deposit made just before a settlement gets no share of it; `settle` only books any NAV drift since purchase. See [10-security.md](10-security.md).
