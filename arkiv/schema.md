# Arkiv schema

Four named schemas, declared once in `web/src/server/arkiv/schema.ts` with `defineSchema` from `@arkiv-network/sdk/schema`. Indexed columns are the ones a screen filters or sorts on; everything else is stored only.

Numbers follow the contracts: USDC amounts are 6-decimal integers (`u256`), claim amounts and NAV are 18-decimal integers (`u256`), timestamps are unix seconds (`u64`), spread terms are basis points (`i32`).

## `earlyout.claims`, one per sale

| Column | Type | Indexed | Meaning |
|---|---|---|---|
| claimId | str | yes | ERC-1155 id, 0x-prefixed 32-byte hex |
| fund | addr | yes | Fund token on Arc |
| symbol | str | yes | Fund symbol |
| settleAt | u64 | yes | Payout date. The entity expires at this moment |
| status | str | yes | `open`, `bought` or `settled` |
| amount | u256 | | Claim units sold, 18dp |
| usdcPaid | u256 | | USDC the seller received, 6dp |
| nav | u256 | | NAV used, 18dp |
| baseBps, utilBps, timeBps, creditBps | i32 | | The four spread terms |
| seller | addr | | Who sold |
| holder | addr | | Who holds it now: the vault, or a buyer |
| txHash | str | | Arc transaction |
| soldAt | u64 | | Block time of the sale |

Expiry: `ExpirationTime.atDate(settleAt)`. A settled claim leaves the book on its own.

## `earlyout.funds`, one per listed fund

| Column | Type | Indexed |
|---|---|---|
| fund | addr | yes |
| symbol | str | yes |
| status | str | yes (`ok` or `failed`) |
| name, nav, navUpdatedAt, settlementDelay, window, capUsdc, deployedUsdc | | |

Refreshed on every NAV update and extended to expire one day after the refresh. If the indexer dies, the directory disappears rather than going stale.

## `earlyout.navs`, one per NAV report

| Column | Type | Indexed |
|---|---|---|
| fund | addr | yes |
| updatedAt | u64 | yes |
| nav, status, txHash | | |

Expires after 30 days. A public record of every NAV report the oracle accepted, for anyone who wants the history; the app's screens read the live NAV from Arc, not from these entities.

## `earlyout.cursor`, one entity

| Column | Type | Indexed |
|---|---|---|
| chainId | u64 | yes |
| lastBlock | u64 | |

The indexer's position on Arc, patched after each sync, so a restart continues where it left off.

## Ownership

Every entity is created and owned by the Earlyout writer wallet, `0x343F684dAFFf216CDf38a40888662148eBa07Fd7`. Only that wallet can patch, extend or delete an entity; queries on the Book screen filter with `ownedBy(writer)` so entries written by anyone else are never shown. Nobody else needs write access: a claim exists on Arkiv because a `ClaimSold` event exists on Arc.

## What stays off Arkiv

Wallet identity, KYC status and allowlists. Arkiv holds what a distributor's dashboard needs and nothing about who a person is.
