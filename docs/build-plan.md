# Earlyout build plan

Phased so the project is submittable after every phase, and every phase ends with a check that must pass before the next starts. Status as of Fri 6 Nov, evening IST.

## Deadline

ETHGlobal's event page lists Project Submissions Due at Saturday 7 Nov, 09:00 IST, with judging from 09:30 IST. Confirm on the Hacker Dashboard. The cut order at the bottom applies whatever the date turns out to be.

## Ownership

Everything is built and run from one session and one machine: contracts, the Arc Studio turns, deploy, NAV pusher, `web/`, the Arkiv indexer and docs, the CRE workflow, README and submission. No step waits on work from anyone else.

Arc Studio project: https://studio.arc.io/app/b9396e35-441e-4180-9444-965d2ad5dc59

## Wallets (testnet only, keys never in the repo)

| Role | Address |
|---|---|
| Deployer, contract owner, NAV forwarder until CRE | `0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B` |
| Arkiv writer | `0x343F684dAFFf216CDf38a40888662148eBa07Fd7` |

## Verified facts

| Item | Value |
|---|---|
| Arc testnet | Chain ID 5042002, RPC `https://rpc.testnet.arc.io`, explorer `https://explorer.testnet.arc.io` |
| USDC on Arc | `0x3600000000000000000000000000000000000000`, ERC-20, 6 decimals. Native gas balance is 18 decimals; never use it for accounting |
| Test USDC | `https://faucet.circle.com` |
| ACRED NAV feed, Ethereum mainnet | `0x35DDfB90011E686CCf837a6819562705076207EB`, 8 decimals, 1113.7732 on 5 Nov 22:00 UTC, daily heartbeat |
| CRE chain names | `arc-testnet` (selector 3034092155422581607), `ethereum-mainnet` |
| CRE forwarder on Arc, simulation | `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` |
| CRE forwarder on Arc, deployed | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| Arkiv testnet Rabdi | Chain ID 7794095, RPC `https://rpc.rabdi.db-chain.testnet.arkiv.network`, faucet and access keys at `https://hub.arkiv.network` |
| Arkiv SDK | `@arkiv-network/sdk` 1.0.1, Node 22.10+. Text fields 128 bytes, 31 fields per schema, lifetime up to about 182 days, 100 rows per query |

## Phases

### Phase 1: contracts (done)

Seven contracts and a deploy script, sent into our Arc Studio app with the CLI. Studio installed OpenZeppelin 5.7.0, ran the suite, ran its security review and Slither, fixed five Medium findings and added 13 tests. Pulled back with `arc-studio pull`. 63 tests pass in `contracts/`. Prompts and the full report are in `docs/studio/`.

Interface the app relies on: `Vault.quote`, `quoteFund`, `sell`, `buy`, `settle`, `markImpaired`; `ClaimWrapper.depositAndSell`, `claimFund`, `claimSettleAt`; `NavOracle.onReport` and `getNav`; events `ClaimMinted`, `ClaimSold`, `ClaimBought`, `ClaimSettled`, `FundImpaired`, `NavUpdated`. `pnpm check:abi` in `web/` verifies the app's ABI against the compiled contracts.

One High finding is open by decision: LP gain sniping, accepted for the testnet demo and listed in the README's honest limits.

Check: `forge test` green, `pnpm check:abi` green. Both pass.

### Phase 2: web app (built, awaiting visual check)

Next.js 16, wagmi, viem, Motion. Four screens: Sell, Book, Vault, Status. Apple-style system: system font with size-specific tracking, translucent toolbar, press feedback on pointer-down, springs with no overshoot for the tab indicator, bottom sheet for receipts, reduced motion and reduced transparency honoured.

The app reads the chain by default. `NEXT_PUBLIC_MODE=mock` is an opt-in demo data mode for UI work only and is never a fallback. Missing addresses show a configuration error, not a blank page.

Backend lives in Next route handlers: `/api/issuer-status` (the outside API the CRE workflow reads; reflects `IssuerStub.failed()` on Arc), demo switches, and later the NAV pusher and the Arkiv sync.

Check: `pnpm check` (lint and typecheck) and `pnpm build` green; every screen walked through in mock mode; then again against the deployed contracts.

### Phase 3: deploy and real NAV

1. Fund the deployer with test USDC.
2. Done in Arc Studio: Studio created a Circle developer-controlled wallet in the workspace, deployed and configured all contracts following `Deploy.s.sol` (34 transactions), and handed ownership and the oracle forwarder to our ops wallet. Vault seeded and issuer funded from the ops wallet afterwards. An earlier `forge script` deployment from our own wallet is superseded; its addresses are kept in `contracts/deployments/arc-testnet.superseded-forge.json`.
3. `pnpm sync-addresses` writes the deployed addresses into `web/.env.local`.
4. Push the first NAV: read `latestRoundData()` from the ACRED feed on mainnet and call `onReport` on NavOracle. CRE later replaces this by changing one address.

Check: Sell screen shows BUY with the real ACRED price on the live app.

### Phase 4: Arkiv book

The indexer scans Arc events and writes to Arkiv with the writer wallet. The Book screen reads only from Arkiv.

| Schema | Written on | Expires |
|---|---|---|
| `earlyout.funds` | each NAV update | 1 day after the last refresh, so a dead indexer never leaves stale data |
| `earlyout.claims` | each `ClaimSold` | on the payout date, so settled claims vanish on their own |
| `earlyout.navs` | each NAV update | 30 days |

Required files: `arkiv/schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`, `how-you-use-arkiv.md`. README lists the writer wallet and one runnable query.

Check: sell a claim on Arc and it appears in the Book within seconds; a demo-window claim disappears after its payout time with no code of ours deleting it.

### Phase 5: Chainlink CRE

TypeScript workflow in `cre/`: cron trigger, read `latestRoundData()` and `decimals()` from the mainnet feed, GET `/api/issuer-status`, encode the report, write it to NavOracle on `arc-testnet`. Set the oracle forwarder to the simulation forwarder, then `cre workflow simulate <name> --broadcast --target staging-settings`.

Check: the simulation's transaction updates NavOracle; flipping the issuer switch and re-running shows HALT in the app.

If this phase is not working in time, keep the Phase 3 pusher, drop the Chainlink prize, and say so in the README.

### Phase 6: judge-facing extras, in order of value

1. Try as judge: a server wallet allowlists the visitor and mints demo fund tokens.
2. More funds from the feed table (mGLOBAL at 8 decimals, USPC at 18).
3. `buy()` from the Book screen.
4. Bids as an Arkiv schema that expire when the bid lapses.

### Phase 7: submission

Repo public. README: addresses, Studio URL, architecture diagram, real versus stand-in table, AI usage by file, Arkiv wallet and query, honest limits. Demo video: the problem with ACRED's real schedule; sell (BUY, four terms, USDC arrives); REFUSE; Book from Arkiv; issuer fails (CRE run, HALT, share price drops); Arc Studio. Three prizes selected, Arc bounty named: Best DeFi App.

## Cut order if time is short

Bids, `buy()`, extra funds, Try as judge, then CRE. Never cut the sell flow, the failure demo or the Arkiv Book.

## Honest limits to state in the README

- While a wallet we control is the forwarder, it can overwrite a status with a same-timestamp report. Ends when the CRE forwarder takes over.
- Settlement needs a keeper to call `settle` at maturity.
- Fund tokens, the issuer and the issuer status API are stand-ins; NAV, USDC, all contracts and the Arkiv book are real.
- Demo switches on the Status screen act on the stand-in issuer. They are testnet only and may be gated with `DEMO_TOKEN`.
