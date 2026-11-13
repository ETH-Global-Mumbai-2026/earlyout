# 09. Deployment and operations

Everything runs on testnets: Arc testnet (chain 5042002) for the contracts, Arkiv Rabdi (chain 7794095) for the book, Ethereum mainnet only as a read source for NAV feeds.

## Wallets and roles

| Wallet | Address | Role | Key lives in |
|---|---|---|---|
| Ops wallet | `0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B` | `owner()` of FundRegistry, NavOracle, IssuerStub, ClaimToken, ClaimWrapper, Vault and every fund token; NavOracle forwarder; demo holder; signs `/api/nav/push`, `/api/issuer-status` POST and `/api/demo/judge` | `OPS_PRIVATE_KEY` on Vercel and in `web/.env.local` |
| Arkiv writer | `0x343F684dAFFf216CDf38a40888662148eBa07Fd7` | Creates and patches every Earlyout entity on Arkiv | `ARKIV_WRITER_PRIVATE_KEY` |
| Studio deployer | `0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3` | Circle developer-controlled wallet that Arc Studio created and deployed from; owns nothing after hand-over | Circle / Arc Studio |
| CRE simulation signer | not recorded here | Pays gas for `cre workflow simulate --broadcast` | `CRE_ETH_PRIVATE_KEY` in `cre/.env` |

The ops wallet is a single hot key with full control of the testnet deployment. Its native USDC balance pays gas for the demo routes; the routes refuse to spend it below 2 USDC.

## Web app on Vercel

- Vercel project `earlyout`, linked from `web/` (`web/.vercel/project.json`, git-ignored), production URL https://earlyout.vercel.app, deployed from `main`.
- Environment variables as listed in [07-web-app.md](07-web-app.md#environment-variables). Set the public addresses, the server keys, `DEMO_TOKEN`, `CRON_SECRET`, `FUND_FEEDS`, `ETH_RPC`, `ARC_DEPLOY_BLOCK` and `ARKIV_WRITER_ADDRESS`. The values are not in the repository and could not be checked here.
- Cron jobs from `web/vercel.json`:

| Path | Schedule (UTC) | Effect |
|---|---|---|
| `/api/nav/push` | `0 0 * * *` (daily 00:00) | Pushes mainnet NAVs and the stub's status to NavOracle, signed by the ops wallet. Needs `CRON_SECRET` |
| `/api/arkiv/sync` | `30 0 * * *` (daily 00:30) | One block-scan window into Arkiv |

The daily NAV push is well inside the 96-hour `maxAge`, so funds do not halt on staleness while the cron runs. All rate limits and caches are in-memory per server instance; a cold start resets them.

## Contracts

### What is deployed

The live contracts were deployed on 6 November 2026 by Arc Studio (34 transactions, block 71057910) from the Studio deployer, using the same steps as `contracts/script/Deploy.s.sol` but one transaction at a time from `docs/studio/deploy-earlyout.ts`, with:

```
NEW_OWNER=0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B
DEMO_HOLDER=0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B
EXPOSURE_CAP_USDC=20
VAULT_SEED_USDC=0
ISSUER_FUND_USDC=0
INITIAL_NAV_8DP=111377320000
INITIAL_NAV_UPDATED_AT=1793916047
```

The vault and the issuer were then funded from the ops wallet. On 7 November Studio deployed eight more FundToken stand-ins (48 transactions, `docs/studio/deploy-earlyout-funds.ts`, block 71084972) and the ops wallet listed them in FundRegistry and posted their first NAV reports. The full transaction lists are in `docs/studio/04-deployment-transactions.md` and `docs/studio/06-more-funds.md`. Addresses: [03-contracts.md](03-contracts.md#deployed-addresses-arc-testnet-chain-5042002).

### Deploying a fresh set with Foundry

```bash
cd contracts
NEW_OWNER=0x... DEMO_HOLDER=0x... EXPOSURE_CAP_USDC=20 VAULT_SEED_USDC=0 ISSUER_FUND_USDC=0 \
INITIAL_NAV_UPDATED_AT=<feed updatedAt> \
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
cd ../web && pnpm sync-addresses
```

Keep the USDC seed and issuer funding at 0 (Foundry cannot simulate Arc USDC; fund them with `cast send` afterwards). The script writes `contracts/deployments/arc-testnet.json`. Then update `oracleAddress` and the fund addresses in `cre/nav-bridge/config.*.json`, the Vercel environment, and `FUND_FEEDS`.

### Listing another fund

FundRegistry already holds its maximum of ten funds, so a new listing needs a new registry or a contract change. With room, the steps are: deploy a `FundToken`, allowlist `ClaimWrapper`, `IssuerStub` and any holders on it, call `FundRegistry.listFund(fund, terms)` as owner, post a first NAV report through the oracle, and add the fund to the CRE config, `FUND_FEEDS` and `CATALOG` in `web/src/lib/glossary.ts`.

## Keeper duties

Nothing in this repository settles claims automatically. After a claim's payout date someone must call:

```bash
cast send 0x7A40b36b012DC19b1f42dd68C13F4daE312e2319 "settle(uint256)" <claimId> \
  --rpc-url https://rpc.testnet.arc.io --private-key $OPS_PRIVATE_KEY
```

`settle` is permissionless. It reverts with `NotDue` before the payout date, `NotHeld` if the vault has no position, and (through IssuerStub) if the issuer is failed, the NAV is missing or stale, or the stub cannot pay. Claim ids come from the Book (`claimId` column), the `ClaimSold` events, or `ClaimToken.claimId(fund, settleAt)`.

The IssuerStub must hold enough USDC to pay `amount × NAV` for each claim it settles. The demo script notes that a 0.001 ACREDd sale needs about 1.11 USDC at settlement.

## Monitoring

| What | How |
|---|---|
| Fund health, NAV age, exposure, issuer status | `/status` in the app, or `GET /api/state` |
| A quote's verdict | `GET /api/quote?fund=&amount=` |
| Issuer flag | `GET /api/issuer-status` |
| Oracle forwarder and pins | `cast call <NavOracle> "forwarder()(address)"`, `expectedWorkflowOwner()`, `expectedWorkflowId()` |
| Vault | `cast call <Vault> "totalAssets()(uint256)"`, `deployedUsdc()`, `sharePrice()`, USDC `balanceOf(vault)` |
| Ops wallet gas | `cast balance 0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B --rpc-url https://rpc.testnet.arc.io` (18dp native USDC) |
| Arkiv book | `/book`, or `pnpm arkiv:query` |
| Indexer progress | `POST /api/arkiv/sync` with no body returns `fromBlock` and `toBlock` |

There is no alerting. Nobody is paged when a NAV goes stale or a claim passes its payout date.

## Runbooks

All write commands below are testnet transactions from the ops wallet. Get the owner's explicit yes before sending any of them.

### Simulate an issuer failure (demo)

1. On `/status`, enter the demo key, press Simulate issuer failure. This calls `POST /api/issuer-status {"failed": true}`, which calls `IssuerStub.setFailed(true)`.
2. Press Refresh NAV (or wait for the cron, or run a CRE broadcast) so the FAILED status reaches NavOracle. Until then quotes still read the old status.
3. Quotes for every fund that received the report (every fund in `FUND_FEEDS`, or every configured fund for a CRE run) now return HALT "Issuer reports failure". If the vault holds claims in a fund, LP deposits and withdrawals are paused (lock 2).
4. Write the exposed funds down: Mark impaired on `/status`, or `pnpm impair mark <fund> [fund…]` from `web/`. LP flows reopen with the lower share price.

### Recover from an issuer failure

1. `POST /api/issuer-status {"failed": false}` (Restore issuer on `/status`).
2. Push a NAV report with status OK (Refresh NAV). Quotes for unimpaired funds return to BUY.
3. For each impaired fund, `pnpm impair clear <fund> [fund…]` (owner only; reverts while the oracle still reports FAILED). Until this runs, deposits stay paused (lock 1) and quotes for those funds read HALT "Fund is impaired".

### NAV is stale (HALT "NAV is stale")

1. Check `NavOracle.getNav(fund)`: `updatedAt` older than 96 hours, or NAV zero.
2. Check `NavOracle.forwarder()`. If it is not the ops wallet, the server pusher refuses to run ("CRE may already own it"); either run a CRE broadcast or set the forwarder back.
3. Run Refresh NAV on `/status` or `POST /api/nav/push` with the demo key. A 503 means the ops wallet is under 2 USDC: top it up.
4. If the pusher succeeds but a fund stays stale, check that `FUND_FEEDS` includes it and that its mainnet feed itself has updated (the report carries the feed's own `updatedAt`).
5. A report older than the stored one reverts `StaleReport`; one more than 5 minutes in the future reverts `FutureReport`.

### Vault short of USDC or over cap (REFUSE)

- "Vault short of USDC": idle USDC is below the payout. Deposit USDC as an LP, or wait for settlements.
- "Over the fund cap": `fundCost` plus the payout exceeds the fund's 20 USDC cap. Settle due claims, or raise the cap with `FundRegistry.setTerms` (owner; pass the full `Terms` struct).

### Settlement reverts

- `NotDue`: wait for `settleAt`.
- `IssuerFailed` or `OracleReportsFailure`: the issuer is failed; recover first.
- `NoNav` or `NavStale`: push a fresh NAV, then retry. Nothing was consumed.
- A USDC transfer failure from IssuerStub: top up the stub with USDC.

### Book is missing a sale

1. `POST /api/arkiv/sync` with `{"tx":"<sale hash>"}` re-indexes that sale; it is skipped if already present or if the payout is less than a minute away.
2. If many are missing, `POST /api/arkiv/sync` with no body repeatedly until `toBlock` reaches the head (each call scans up to 5,000 blocks; calls within 30 seconds return the previous report).
3. Check `ARKIV_WRITER_PRIVATE_KEY` is set and the writer has tGLM for gas.

### Record a CRE broadcast

Point the oracle at the simulation forwarder, run `cre workflow simulate ./nav-bridge --target staging-settings --broadcast`, then point it back to the ops wallet straight away. While the simulation forwarder is set, anyone can deliver a report. Commands in [05-oracle-and-cre.md](05-oracle-and-cre.md#simulating).

### Ops wallet running low

The judge route, NAV push and issuer switch all stop at 2 USDC of native balance. Top up from https://faucet.circle.com (Arc testnet USDC).

## Demo and judge routes

| Route | Who | Guard |
|---|---|---|
| `POST /api/demo/judge` | Any visitor ("Try as judge" on `/sell`) | Open by default; `JUDGE_TOKEN` locks it. Arc testnet only, 5 calls per minute per IP, 20 new wallets per hour per instance, 2 USDC reserve |
| `POST /api/issuer-status` | Operator | `DEMO_TOKEN` in `x-demo-token`, fails closed |
| `POST /api/nav/push` | Operator or Vercel cron | `DEMO_TOKEN` or `CRON_SECRET`, fails closed |

The demo video procedure is in `docs/demo-script.md`.
