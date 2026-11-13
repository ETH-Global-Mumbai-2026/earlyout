# 10. Security

Earlyout is a testnet deployment. It has had one automated review (Arc Studio, 6 November 2026, recorded in `docs/studio/02-security-review.md`) and no independent audit. One High finding is open by decision. Nothing here is ready for real money; the checklist at the end lists what is missing.

## Assets and actors

| Asset | Held by |
|---|---|
| LP USDC | Vault (idle) and claims at cost |
| Sellers' fund tokens | IssuerStub (queued redemptions) |
| Redemption USDC | IssuerStub until settlement, then ClaimWrapper until redeemed |
| Price and halt signals | NavOracle |
| The public book | Arkiv entities owned by the writer wallet |
| Operational keys | Ops wallet, Arkiv writer, demo and cron tokens on the server |

| Actor | Can |
|---|---|
| Anyone | Quote; call `settle`, `collect`, `markImpaired` (when FAILED), `/api/arkiv/sync`, read routes, `/api/demo/judge` (open by default) |
| Allowlisted holder | `deposit`, `depositAndSell`, receive claim transfers, `buy` |
| LP | ERC-4626 `deposit`, `mint`, `withdraw`, `redeem` (subject to the LP lock and the idle cap) |
| Oracle forwarder (ops wallet today) | Write any NAV and status |
| Owner (ops wallet) | Set terms, globals, allowlists, forwarder, workflow pins, issuer failure, `clearImpaired`; mint fund tokens; transfer or renounce ownership |
| Server holding `DEMO_TOKEN` or `CRON_SECRET` | Flip the stub issuer, push NAV |

## Threats and mitigations

| Threat | Mitigation in code | Residual risk |
|---|---|---|
| Wrong or manipulated NAV | Forwarder-only writes; older reports rejected; reports more than 5 minutes ahead rejected; optional workflow owner and id pinning; vault halts on NAV older than `maxAge` or zero | The forwarder is a single hot key today and can write any value |
| Another CRE workflow writing our funds | `setExpectedWorkflowOwner` / `setExpectedWorkflowId` | Pinning is off; must be set before using the deployed forwarder |
| Selling into a failed fund | HALT on FAILED status; `markImpaired` writes down for every LP at once | Gap between the issuer failing and the report landing |
| LP exiting before a writedown, or entering before a recovery | LP lock states 1 and 2 (`maxDeposit`, `maxMint`, `maxWithdraw`, `maxRedeem`) | None known |
| LP gain sniping at settlement | None (open High, below) | Accepted for testnet |
| Bank run on the vault | Withdrawals capped at idle USDC; claims never sold to pay LPs | LPs may wait for settlements |
| Over-concentration | Per-fund exposure cap; idle-USDC check | Caps are owner-set |
| Reentrancy | `nonReentrant` on `sell`, `buy`, `settle`; claim moves before USDC in `sell` | ERC-4626 entry points are unguarded but make no external call mid-update |
| Share inflation (donation) attack | Decimals offset 6 | Deployer's seed shares are withdrawable |
| Settling on a bad NAV | IssuerStub reverts on FAILED, zero or stale NAV before consuming the redemption | `collect` is permissionless: the first caller after the payout date fixes the NAV used |
| Ineligible holders | Allowlists on FundToken and ClaimToken for every non-mint, non-burn transfer; ClaimWrapper requires the caller to be on the claim allowlist | `redeem` skips the allowlist on purpose so a removed holder can still exit |
| Forged Book entries | Every read filters `ownedBy(writer)` | Anyone can still write under the schema name; unfiltered readers would see them |
| API abuse | Per-route, per-IP rate limits; `readAllowance` only for known tokens and spenders; quote amounts clamped; errors trimmed with RPC URLs removed | Limits are in-memory per instance |
| Draining the ops wallet | Demo routes keep a 2 USDC reserve; judge setups capped at 20 wallets per hour per instance; Arc testnet only | `/api/demo/judge` is open unless `JUDGE_TOKEN` is set |
| Leaving the demo halted | Issuer switch and NAV push fail closed without `DEMO_TOKEN` (or `CRON_SECRET` for the push); constant-time comparisons | Token holders can halt the demo |

## Arc Studio review

Scope: FundRegistry, NavOracle, IssuerStub, ClaimToken, ClaimWrapper, FundToken, Vault and IReceiver. Two independent source reviews, Slither, and Foundry runs before and after. 50 of 50 tests passed on the code as received; after the fixes 63 of 63 pass (13 new tests in `contracts/test/ReviewFixes.t.sol`). Two existing tests were edited to push a fresh NAV after warping 90 days.

### Open: High, LP gain sniping

Claims sit in `totalAssets()` at cost and the whole gain appears in one step when `settle` runs (also when `buy` sells above cost, or `clearImpaired` lifts a writedown). `deposit` and `redeem` are open at all times, so capital that arrives just before a settlement takes a pro-rata share of a gain earlier LPs funded and can leave right after. The proof of concept (`docs/studio/poc/LpGainSniping.t.sol.txt`): with 100,000 USDC of LP capital and one 10-unit claim worth a 667.15 USDC gain, an attacker who deposits 1,000,000 USDC, calls `settle` and redeems in one transaction keeps 606.50 USDC; the existing LP gets 60.65.

Options from the review: (1) accrue claim value linearly from sale to payout inside `totalAssets()`, true-up at settlement; (2) stream realised gains over a fixed period; (3) accept for the demo. Decision: option 3 for testnet, option 1 before any real money.

### Fixed: five Medium findings

| Id | Finding | Fix |
|---|---|---|
| M1 | LPs could exit between a FAILED report and `markImpaired`, or enter between a recovery report and `clearImpaired` | LP lock via the four `max*` functions |
| M2 | A future-dated NAV report froze a fund and underflowed the staleness check | `MAX_FUTURE_DRIFT` (5 minutes) in NavOracle; vault never subtracts blindly |
| M3 | NavOracle trusted the forwarder address alone, though the CRE forwarder is shared | Optional workflow owner and id pinning from forwarder metadata |
| M4 | Settlement could lock in a missing, stale or FAILED NAV irreversibly | IssuerStub `settle` reverts first (`NoNav`, `NavStale`, `OracleReportsFailure`) and stays retryable |
| M5 | `depositAndSell` skipped the claim allowlist; `deposit` could mint an untransferable claim | `_deposit` requires the caller on the ClaimToken allowlist |

### Left as is: Low and informational

- Single-step `Ownable` with `renounceOwnership` on every contract. Recommend `Ownable2Step` and disabled renounce at mainnet.
- Owner can change any fund's terms instantly, including `recoveryBps`, which re-prices impaired positions. Recommend a timelock or multisig owner and snapshotting `recoveryBps` at impairment.
- `ClaimWrapper.redeem` does not check the allowlist (deliberate; a compliance freeze belongs at the issuer or fund-token level).
- `collect` is permissionless, so the first caller after the payout date picks the stored NAV used.
- `ClaimWrapper.setVault` never revokes the old vault's approval.
- Rounding: `redeem`, `quote` and `costShare` round down; `buyPrice` rounds down in the buyer's favour, so a dust-sized `buy` can cost 0. None is profitable after gas.
- No check that fund tokens have 18 decimals; the `amount × nav / 1e30` maths assumes it.
- The deploy seed shares belong to the deployer and can be withdrawn (the live deployment used a seed of 0).
- Two writers posting an equal `updatedAt` can overwrite each other's status.
- FundRegistry does not validate `window` against `settlementDelay`.
- `markImpaired` is idempotent and re-emits `FundImpaired`.
- In `depositAndSell`, `ClaimMinted.owner` is the wrapper, not the seller.
- Slither: no actionable High or Medium.

## Trust assumptions today

1. The ops wallet is honest and its key is safe. It owns every contract and is the oracle forwarder, so it can set any price, halt or un-halt any fund, change terms and allowlists, and mint stand-in fund tokens.
2. The stand-in issuer holds enough USDC to pay redemptions.
3. Someone calls `settle` after each payout date.
4. The Next.js server keeps `OPS_PRIVATE_KEY`, `ARKIV_WRITER_PRIVATE_KEY`, `DEMO_TOKEN` and `CRON_SECRET` secret.
5. Chainlink's mainnet NAV feeds are correct, and the server reads them from an honest Ethereum RPC.

## Before mainnet

From the review, the README and the code:

- [ ] Fix LP gain sniping with linear accrual of claim value inside `totalAssets()` (review option 1).
- [ ] Independent audit of the contracts.
- [ ] Replace `IssuerStub` with the real issuer's redemption path, and `FundToken` with real fund tokens; confirm their decimals (the maths assumes 18).
- [ ] Replace the issuer status API with the issuer's own attestation.
- [ ] Deploy the CRE workflow to the CRE network, set `expectedWorkflowOwner` and `expectedWorkflowId`, then point the forwarder at the deployed KeystoneForwarder. Retire the server pusher.
- [ ] Move ownership to a multisig behind a timelock; switch to `Ownable2Step` and disable renounce.
- [ ] Snapshot `recoveryBps` at impairment time.
- [ ] Seed the vault with shares sent to a dead address.
- [ ] Automate settlement with a keeper, and add alerting for stale NAV, failed issuers and overdue claims.
- [ ] Decide the allowlist policy for `redeem` and for removed holders.
- [ ] Remove or lock the demo routes (`/api/demo/judge`, issuer switch, NAV push) and the testnet strip (`NEXT_PUBLIC_TESTNET=false` on the redesign branch).
- [ ] Raise or remove FundRegistry's ten-fund limit if more funds are needed (it bounds the `totalAssets` loop).
- [ ] Legal and compliance review of buying redemption claims, and permission to use issuer logos (the redesign ships them at the owner's risk).
