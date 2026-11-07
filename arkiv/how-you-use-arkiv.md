# How Earlyout uses Arkiv

## Writing

One wallet writes, `0x343F684dAFFf216CDf38a40888662148eBa07Fd7` on the Rabdi testnet, from `web/src/server/arkiv/sync.ts` through the route `/api/arkiv/sync`. It writes in two ways.

**Each sale, seconds after it happens.** When a sale completes, the app posts its Arc transaction hash. The server reads that receipt from Arc, decodes the `ClaimSold` event emitted by our Vault, looks up the claim's fund and payout date, and calls `createEntity(Claims, ..., { expiration: ExpirationTime.atDate(settleAt) })`. One entity per sale: several sales can share a claim id (same fund, same payout window), so before writing it checks whether an entity for that exact transaction already exists, which makes the call safe to repeat.

**A block scan for everything else**, once a day by cron, or on a POST to `/api/arkiv/sync` with no body. Each run:

1. Reads its cursor entity to find the last Arc block it handled.
2. Fetches `ClaimSold`, `ClaimBought`, `ClaimSettled` and `NavUpdated` logs from the Earlyout contracts since then.
3. Records any sale the first path missed, with the same one-per-transaction check.
4. For each `ClaimBought` or `ClaimSettled`, patches every entity for that claim to update `status` and `holder`.
5. For each `NavUpdated`, creates a `Navs` entity and patches the fund's `Funds` entity, then `extendEntity` so it expires one day after this refresh.
6. Patches the cursor (skipped when a run finds nothing and the window is under 2,000 blocks, so an empty run costs no transaction).

Every write is a transaction on Rabdi, paid in tGLM.

## Who can edit each entity, and when it expires

| Entity | Who can edit | Expires | Why that fits |
|---|---|---|---|
| `earlyout.claims` | only the writer wallet, which patches `status` and `holder` when Arc says a claim was bought or settled | at the claim's payout date (`ExpirationTime.atDate`) | an open claim stops being open the moment it is due, so the book never lists a claim nobody can buy |
| `earlyout.funds` | only the writer wallet, on every NAV update | one day after the last refresh (`extendEntity`) | if our indexer stops, the directory vanishes instead of showing a stale NAV |
| `earlyout.navs` | nobody after creation | 30 days | NAV history is an append-only record |
| `earlyout.cursor` | only the writer wallet | 180 days | the indexer's position on Arc, so a restart resumes where it stopped |

Arkiv itself does not stop another wallet from creating entities tagged with our schema names. Every read therefore filters with `ownedBy(writer)`, and the Book screen names the writer wallet under the list.

## What each Arkiv feature changes on screen

| Arkiv feature | Where it is used | What the user sees |
|---|---|---|
| Indexed columns `status`, `symbol`, `settleAt` | `openClaims()` filters on status and sorts by payout date; the fund filter on the Book screen narrows that list in the browser | Open claims only, soonest payout first, one tap to narrow to a fund |
| Expiry at the payout date | `createEntity(Claims, ..., { expiration: ExpirationTime.atDate(settleAt) })` | A claim leaves the Book the moment it is due, with no delete code anywhere. The 15-minute demo fund shows this live |
| Expiry one day after refresh | `extendEntity` on `Funds` each NAV update | A fund directory that cannot go stale: if the indexer stops, the directory disappears instead of lying |
| Owner wallet | `ownedBy(writer)` in every query | The Book shows only entries written by Earlyout's wallet, and says which wallet at the bottom of the screen |
| Patch | `ClaimBought` and `ClaimSettled` patch `status` and `holder` | Bought or settled claims get a new `status` and `holder`, so they leave the Book |
| Entity key | Each row links to `rabdi.explorer.arkiv.network/entity/<key>` | Anyone can open the raw entity next to the Arc transaction |
| One entity per sale | `createEntity` per `ClaimSold`, checked against `txHash` | Two sales into the same claim window show as two rows, each with its own seller, price and proof |

## Reading

The Book screen (`/book`) and the Vault screen's positions table read only from Arkiv, through `/api/book`, which runs the query in `web/src/server/arkiv/read.ts` and shares one read across visitors for five seconds. Neither screen falls back to our own database; there is none.

## Running the query yourself

See the README section "Query it yourself", which gives the writer wallet and a script you can run against the public RPC.
