# Earlyout: security review

Scope: FundRegistry, NavOracle, IssuerStub, ClaimToken, ClaimWrapper, FundToken, Vault (plus IReceiver). Max-depth review: two independent reviews of the source, Slither across the project, and a Foundry run before and after the changes. Target chain: Arc Testnet.

Result: 5 Medium findings fixed, 1 High finding open and waiting on your decision, the rest listed below and left as is. This is a best-effort automated review, not a substitute for an independent audit before any mainnet use.

Tests: 50 of 50 passed on the code as received. After the changes: 63 of 63 pass (50 existing, 13 new in `contracts/test/ReviewFixes.t.sol`). Two existing tests were edited, see "Test changes".

## Open decision (High): LP gain sniping

Status: not fixed. Needs a product decision because the fix changes the accounting model you specified ("claims at cost").

Claims sit in `totalAssets()` at cost, and the whole gain appears in one step when `settle` runs (or when `buy` sells a claim above cost, or `clearImpaired` lifts a writedown). `deposit` and `redeem` are open at all times. So new capital that arrives just before `settle` is credited with a pro-rata share of a gain that existing LPs funded for the whole holding period, and can leave right after.

Reproduced (`docs/poc/LpGainSniping.t.sol.txt`, drop into `contracts/test/` to run): LP has 100,000 USDC, the vault holds one 10 unit claim. Claim gain at settlement is 667.15 USDC. An attacker deposits 1,000,000 USDC, calls `settle`, and redeems in the same transaction: attacker keeps 606.50 USDC, the existing LP receives 60.65 USDC. No lockup, no price risk, borrowed capital works.

Options:
1. Accrue claim value linearly from sale to payout date inside `totalAssets()` (true-up at settlement). Removes the incentive entirely. Largest change: needs per-tranche accrual bookkeeping, and the "held at cost" and "gain realised at settlement" tests change.
2. Stream realised gains over a fixed period (for example 24 hours) so a gain unlocks gradually. Small change (about 30 lines), keeps cost basis, but only shrinks the attack: capital has to stay at risk for the stream period, and an attacker who deposits a day ahead of a public payout date still takes a large share.
3. Accept for the testnet demo and document it (the demo vault is seeded with a few USDC and settles 15-minute claims, so the incentive is small).

Recommendation: option 1 before any real money, option 3 for the hackathon demo. Say which and the change will be made and tested.

## Fixed

### M1. LPs could exit before a failure writedown (or enter before a recovery)
`Vault.sol`. When the oracle reports FAILED, trading halts immediately but `totalAssets()` only drops when someone calls `markImpaired`. In that gap an LP could withdraw idle USDC at the old share price and leave the loss with everyone else. The mirror case: after the oracle reports the issuer recovered but before `clearImpaired`, a new LP could deposit at the written-down price and take the rebound.
Fix: LP flows are paused while the vault's impairment flag disagrees with the oracle for a fund the vault has money in. Failure reported, not yet marked: deposit, mint, withdraw and redeem are all disabled until anyone calls `markImpaired`. Recovery reported, not yet cleared: only deposit and mint are disabled; exits stay open. Done through `maxDeposit`, `maxMint`, `maxWithdraw`, `maxRedeem`, so previews and the standard ERC-4626 errors behave normally. The one-transaction writedown is unchanged.

### M2. A future-dated NAV report could freeze a fund
`NavOracle.sol`, `Vault.sol`. `updatedAt` was never compared with the block time. One report stamped far in the future (for example milliseconds sent as seconds) became the stored lower bound, so every later correction was rejected as stale, and `Vault._quote` underflowed on `block.timestamp - updatedAt`. Rotating the forwarder does not clear it.
Fix: reports more than `MAX_FUTURE_DRIFT` (5 minutes) ahead of the block are rejected with `FutureReport`. The vault's staleness check no longer subtracts blindly. Equal `updatedAt` is still accepted, older still rejected, as intended.

### M3. NavOracle trusted the forwarder address alone
`NavOracle.sol`. The CRE forwarder is shared by every workflow, so `msg.sender == forwarder` does not say whose report it is. Any other workflow routed through the same forwarder could write NAV or FAILED status for these funds.
Fix: optional pinning of the workflow owner (`setExpectedWorkflowOwner`) and workflow id (`setExpectedWorkflowId`), checked against the forwarder metadata (`workflowId` bytes 0-31, `workflowOwner` bytes 42-61, layout confirmed against Chainlink's consumer docs). Both default to zero (off), so the existing scripts, tests and the simulation forwarder keep working. Before pointing `forwarder` at the deployed forwarder, set the owner. Do not set them while using the simulation forwarder: its metadata is not meaningful and the mock forwarder accepts anyone, so treat a simulation-forwarder deployment as open.

### M4. Settlement could lock in a missing, stale or failed NAV (irreversibly)
`IssuerStub.sol`. `ClaimWrapper.collect` is permissionless and one-shot. `IssuerStub.settle` read NAV without checking it, so a call right at the payout date with no report (NAV 0), a NAV older than the fund's `maxAge`, or an oracle status of FAILED would consume the redemption and fix the payout permanently.
Fix: `settle` reverts (`NoNav`, `NavStale`, `OracleReportsFailure`) before consuming the redemption, so it can simply be retried once a fresh report lands.

### M5. Claim allowlist skipped on the combined entry path
`ClaimWrapper.sol`. `deposit` then `sell` required the seller to be on the ClaimToken allowlist, but `depositAndSell` did not (the claim only ever touched the allowlisted wrapper and vault), and plain `deposit` could mint an untransferable claim to a non-allowlisted caller.
Fix: `_deposit` reverts with `NotAllowlisted` unless the caller is on the claim allowlist, for both entry points.

## Reviewed and left as is (Low / informational)

Severity here is my assessment; two items the automated rule set rated Medium are downgraded, with reasons.

Downgraded from Medium
- Single-step ownership transfer and `renounceOwnership` on all seven contracts (OpenZeppelin `Ownable`). Standard hygiene, and `Deploy.s.sol` hands ownership to a known address in one script run, which a two-step transfer would break. Recommend `Ownable2Step` plus disabled renounce at mainnet time.
- Owner can change `FundRegistry` terms instantly, including `recoveryBps`, which re-prices impaired positions in `totalAssets()`. Trust assumption on the owner, not an outside exploit. Recommend a timelock or multisig as owner, and snapshotting `recoveryBps` at impairment time.

Low
- `ClaimWrapper.redeem` does not check the claim allowlist, so a holder removed from the list can still redeem. Left deliberately: blocking exits would trap funds. A compliance freeze belongs at the issuer or fund-token level. Needs a policy decision.
- `collect` is permissionless, so anyone can settle at the first moment after the payout date with whatever (fresh enough) NAV is stored, rather than the NAV the keeper meant to land.
- `ClaimWrapper.setVault` never revokes the old vault's `setApprovalForAll`.
- Rounding: `redeem` and `quote` round down (vault-favouring), leaving sub-micro-USDC dust in the wrapper. `buyPrice` rounds down in the buyer's favour, so a dust-sized `buy` can cost 0 USDC (value under 1e-6 USDC per call). `costShare` also rounds down. None is profitable after gas.
- No check that listed fund tokens have 18 decimals; the `amount * nav / 1e30` maths assumes it.
- Deploy script seeds the vault with shares held by the deployer, who can withdraw them. Virtual offset 6 still protects against the inflation attack, but sending the seed shares to a dead address would make the seed permanent.
- A NAV workflow and a status workflow writing the same record at an equal `updatedAt` can overwrite each other's field (the equal-timestamp rule makes the last delivery win).
- `FundRegistry` does not validate `window` against `settlementDelay`, or an oversized `settlementDelay` against `uint64`.
- `markImpaired` is idempotent and re-emits `FundImpaired` on repeat calls.
- In `depositAndSell`, `ClaimMinted.owner` is the wrapper, not the seller.
- Slither: no actionable High or Medium. Reported items are zero-checks flagged as "dangerous equality", intentional round-up of payout dates, unused tuple returns, and reentrancy-pattern warnings on `Vault.sell`/`settle` and `ClaimWrapper.collect`, which only call trusted contracts and are covered below.

## Checked, no issue
- Reentrancy in `Vault.sell`, `buy`, `settle`: all three are `nonReentrant`; the only external hooks are ERC-1155 receiver callbacks to the vault itself or to the buyer after state is final; USDC has no hooks. ERC-4626 entry points are not guarded but no external call happens while vault state is half-updated.
- Share inflation: virtual offset 6 makes a donation attack cost roughly 10^6 times what it could win, and the vault is seeded at deploy.
- `totalAssets` loop is bounded by `MAX_FUNDS = 10`; `fundCost` and `deployedUsdc` cannot underflow (each subtraction matches an earlier addition, rounding errs upward).
- Access control: wrapper-only mint and burn, `setWrapper` once, owner-only allowlists, forwarder-only reports, permissionless `markImpaired` guarded by oracle status, owner-only `clearImpaired` guarded by oracle status.
- Allowlist on FundToken and ClaimToken transfers (including batch) enforced for both ends on every non-mint, non-burn move.
- `ClaimWrapper.redeem` pro-rata: payouts sum to at most the collected amount; claims are burned before USDC is sent; a collected claim id cannot be minted into again.
- Equal `updatedAt` accepted and older rejected, behaviour preserved.

## What changed

Contracts
- `contracts/NavOracle.sol`: future-drift guard, optional workflow owner and id pinning.
- `contracts/Vault.sol`: LP flow pause around impairment, underflow-safe staleness check.
- `contracts/IssuerStub.sol`: settlement refuses missing, stale or failed NAV.
- `contracts/ClaimWrapper.sol`: claim allowlist check on entry.

No existing function or event signature in `context/abi.ts` was changed. New: oracle `MAX_FUTURE_DRIFT`, `expectedWorkflowOwner`, `expectedWorkflowId`, `setExpectedWorkflowOwner`, `setExpectedWorkflowId`; new custom errors only.

Build setup
- `lib/openzeppelin-contracts/` (OpenZeppelin Contracts 5.7.0, `contracts/` folder from the npm package), remapping added to `foundry.toml` and `remappings.txt`. `package.json` still lists 5.6.1 for the web app; Foundry uses the `lib/` copy.

Test changes
- New: `contracts/test/ReviewFixes.t.sol` (13 tests).
- Edited: `IssuerStub.t.sol::test_settlePaysNav` and `ClaimWrapper.t.sol::test_collectThenRedeemProRata` now push a fresh NAV after warping 90 days. They previously settled on a 90-day-old NAV, which is the behaviour M4 removes.
