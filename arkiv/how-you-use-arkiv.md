# How Earlyout uses Arkiv

## Writing

One wallet writes, `0x343F684dAFFf216CDf38a40888662148eBa07Fd7` on the Rabdi testnet. The indexer in `web/src/server/arkiv/sync.ts` runs as a route handler (`/api/arkiv/sync`), called right after a sale completes in the app and on a schedule. Each run:

1. Reads its cursor entity to find the last Arc block it handled.
2. Fetches `ClaimSold`, `ClaimBought`, `ClaimSettled` and `NavUpdated` logs from the Earlyout contracts on Arc since then.
3. For each `ClaimSold`, looks up the claim's fund and payout date on Arc, then `createEntity(Claims, ..., { expiration: ExpirationTime.atDate(settleAt) })`.
4. For each `ClaimBought` or `ClaimSettled`, `patchEntity` on the matching claim to update `status` and `holder`.
5. For each `NavUpdated`, creates a `Navs` entity and patches the fund's `Funds` entity, then `extendEntity` so it expires one day after this refresh.
6. Patches the cursor.

Every write is a transaction on Rabdi, paid in tGLM.

## What each Arkiv feature changes on screen

| Arkiv feature | Where it is used | What the user sees |
|---|---|---|
| Indexed columns `status`, `symbol`, `settleAt` | `openClaims()` filters on status and sorts by payout date; the Book screen filters by fund symbol | Open claims only, soonest payout first, one tap to narrow to a fund |
| Expiry at the payout date | `createEntity(Claims, ..., { expiration: ExpirationTime.atDate(settleAt) })` | A claim leaves the Book the moment it is due, with no delete code anywhere. The 15-minute demo fund shows this live |
| Expiry one day after refresh | `extendEntity` on `Funds` each NAV update | A fund directory that cannot go stale: if the indexer stops, the directory disappears instead of lying |
| Owner wallet | `ownedBy(writer)` in every query | The Book shows only entries written by Earlyout's wallet, and says which wallet at the bottom of the screen |
| Patch | `ClaimBought` and `ClaimSettled` patch `status` and `holder` | A bought claim shows its new holder; a settled one drops out |
| Entity key | Each row links to `rabdi.explorer.arkiv.network/entity/<key>` | Anyone can open the raw entity next to the Arc transaction |

## Reading

The Book screen (`/book`) reads only from Arkiv, through `/api/book`, which runs the query in `web/src/server/arkiv/read.ts`. Neither screen falls back to our own database; there is none.

## Running the query yourself

See the README section "Query the book", which gives the writer wallet and a script you can run against the public RPC.
