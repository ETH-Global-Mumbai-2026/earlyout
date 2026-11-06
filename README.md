# Earlyout

Early exit for funds that redeem on a schedule.

Tokenized private credit funds let investors out once a quarter or once a month. Apollo's tokenized credit fund on Securitize (ACRED) repurchases at least 5% of the fund each quarter and pays once the underlying fund pays; it has no secondary market. An investor who needs cash before the next window has no way out.

Earlyout lets that investor sell their pending redemption today. The redemption becomes a claim token, the investor sells it to a USDC vault on Arc, and the vault collects from the fund when it pays. The price is the fund's real NAV minus a spread that names its four reasons. Every quote shows a verdict first: BUY, REFUSE or HALT.

Built at ETHGlobal Mumbai 2026. Submitted for: **Arc, Best Smart Contracts with Advanced Stablecoin Logic in Arc Studio** · **Arkiv, Build on Arkiv (from scratch)** · **Chainlink, Best workflow with CRE**.

| | |
|---|---|
| Live app | https://earlyout.vercel.app |
| Arc Studio project | https://studio.arc.io/app/b9396e35-441e-4180-9444-965d2ad5dc59 |
| Demo video | _to be filled at submission_ |

## How it works

1. A holder deposits a fund token. ClaimWrapper files the redemption with the issuer and mints an ERC-1155 claim for that fund and payout date.
2. The holder sells the claim to the Vault and receives USDC in the same transaction.
3. The Vault holds the claim at cost, or sells it to a buyer, and collects the full amount at settlement. LPs fund the vault and earn the spread.
4. NAV and issuer status arrive through NavOracle as Chainlink CRE reports. A failed issuer halts trading, and `markImpaired` writes that fund down inside `totalAssets()`, so every LP's share price falls in one transaction.

| Verdict | When |
|---|---|
| BUY | The vault buys at the shown price |
| REFUSE | Over the fund's exposure cap, the vault lacks idle USDC, or the claim is already due |
| HALT | The issuer reports failure, the NAV is stale, or the fund is impaired |

Spread = base + vault usage + volatility × √(time to payout) + issuer credit. All four terms are on screen.

## Architecture

```mermaid
flowchart LR
  subgraph eth[Ethereum mainnet]
    feed[Chainlink NAV feeds, one per fund]
  end
  subgraph api[Earlyout backend, Next.js]
    status[/api/issuer-status]
    sync[/api/arkiv/sync]
    push[/api/nav/push]
  end
  subgraph cre[Chainlink CRE]
    wf[nav-bridge workflow, cron]
  end
  subgraph arc[Arc testnet]
    oracle[NavOracle]
    reg[FundRegistry]
    issuer[IssuerStub]
    wrapper[ClaimWrapper]
    claim[ClaimToken ERC-1155]
    vault[Vault ERC-4626 USDC]
  end
  subgraph arkiv[Arkiv Rabdi]
    book[(earlyout.claims / funds / navs)]
  end
  feed --> wf
  status --> wf
  wf -->|signed report via forwarder| oracle
  oracle --> vault
  reg --> vault
  wrapper --> issuer
  wrapper --> claim
  claim --> vault
  vault -->|events| sync --> book
  book --> web[Book screen]
  vault --> web2[Sell, Vault, Status screens]
```

## Contracts (Arc testnet, chain 5042002)

| Contract | Address | Job |
|---|---|---|
| FundRegistry | [`0x634697188F17eC1064f6e9A0aE000a504983dCe4`](https://explorer.testnet.arc.io/address/0x634697188F17eC1064f6e9A0aE000a504983dCe4) | Listed funds and their terms |
| NavOracle | [`0xCd55924a73771d508887905473d93B981ac4A08b`](https://explorer.testnet.arc.io/address/0xCd55924a73771d508887905473d93B981ac4A08b) | CRE receiver: NAV, timestamp, issuer status |
| IssuerStub | [`0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe`](https://explorer.testnet.arc.io/address/0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe) | Stand-in issuer: queues redemptions, pays NAV after the delay |
| ClaimToken | [`0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090`](https://explorer.testnet.arc.io/address/0x39006ed8b5a1f7c7cd7c6C33f522fF8C8e61B090) | ERC-1155 claims, allowlisted transfers |
| ClaimWrapper | [`0xfc7E6ECF94e88E050c73733aC3cf03f831115952`](https://explorer.testnet.arc.io/address/0xfc7E6ECF94e88E050c73733aC3cf03f831115952) | deposit, depositAndSell, collect, redeem |
| Vault | [`0x7A40b36b012DC19b1f42dd68C13F4daE312e2319`](https://explorer.testnet.arc.io/address/0x7A40b36b012DC19b1f42dd68C13F4daE312e2319) | quote, quoteFund, sell, buy, settle, markImpaired |
| ACRED (stand-in) | [`0xCd5DE841b0f781A866cA6E978A19d6d5431683E2`](https://explorer.testnet.arc.io/address/0xCd5DE841b0f781A866cA6E978A19d6d5431683E2) | 90-day payout, 1-day window |
| ACREDd (demo window) | [`0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F`](https://explorer.testnet.arc.io/address/0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F) | 15-minute payout, 5-minute window |
| JAAA (stand-in) | [`0x7ED73c4653aCf10830f2c5811349bc1d6bF012e1`](https://explorer.testnet.arc.io/address/0x7ED73c4653aCf10830f2c5811349bc1d6bF012e1) | 7-day payout; NAV from its Chainlink feed |
| JTRSY (stand-in) | [`0xAc28d2d4902a705f33C43816599BCaFD3bb194b3`](https://explorer.testnet.arc.io/address/0xAc28d2d4902a705f33C43816599BCaFD3bb194b3) | 1-day payout; NAV from its Chainlink feed |
| USTB (stand-in) | [`0x09367DC8779b7462f41d21ff2782c15D73f7B7D5`](https://explorer.testnet.arc.io/address/0x09367DC8779b7462f41d21ff2782c15D73f7B7D5) | 1-day payout; NAV from its Chainlink feed |
| USCC (stand-in) | [`0x3ff6d44727Cddd81271ca00A1e590818a24Ea3c9`](https://explorer.testnet.arc.io/address/0x3ff6d44727Cddd81271ca00A1e590818a24Ea3c9) | 3-day payout; NAV from its Chainlink feed |
| USTBL (stand-in) | [`0x577Ed63097665601609fC9381Ca229F15AeD30B6`](https://explorer.testnet.arc.io/address/0x577Ed63097665601609fC9381Ca229F15AeD30B6) | 1-day payout; NAV from its Chainlink feed |
| SAFO (stand-in) | [`0x5F10C72fF50fB94348d0F16234551f6872a857a2`](https://explorer.testnet.arc.io/address/0x5F10C72fF50fB94348d0F16234551f6872a857a2) | 1-day payout; NAV from its Chainlink feed |
| CASH+ (stand-in) | [`0x1869711fde2e7d089F3058228cF3AFF4C16a9658`](https://explorer.testnet.arc.io/address/0x1869711fde2e7d089F3058228cF3AFF4C16a9658) | 1-day payout; NAV from its Chainlink feed |
| Treasury+ (stand-in) | [`0xf767D26EE85e09389f410F28728f0Ddca37610e8`](https://explorer.testnet.arc.io/address/0xf767D26EE85e09389f410F28728f0Ddca37610e8) | 1-day payout; NAV from its Chainlink feed |

USDC on Arc: `0x3600000000000000000000000000000000000000`. Deployed at block 71057910 from `0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3` and owned by `0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B`. Explorer: https://explorer.testnet.arc.io.

Contracts were drafted with Claude Code, then installed, tested, security-reviewed and fixed in Arc Studio (five Medium findings fixed; prompts and the full report in `docs/studio/`), and pulled into `contracts/` with `arc-studio pull`. 63 Foundry tests. Deployed by Arc Studio from a Circle developer-controlled wallet created in the Studio workspace (`0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3`), following `script/Deploy.s.sol` step by step. The final transactions hand ownership of all eight contracts and the oracle forwarder role to our ops wallet, so the deployer owns nothing. All 34 transactions are listed in `docs/studio/04-deployment-transactions.md`. A second Studio run on 7 November deployed eight more fund stand-ins from the same wallet and handed each to the ops wallet (prompt and result in `docs/studio/06-more-funds.md`, addresses in `contracts/deployments/arc-testnet-funds.json`); the ops wallet then listed them in FundRegistry and reported each fund's Chainlink NAV.

## What is real and what is a stand-in

| Real | Stand-in, and why |
|---|---|
| Fund NAV: Chainlink NAV feeds on Ethereum mainnet, one per fund: ACRED `0x35DDfB90011E686CCf837a6819562705076207EB` (8 decimals) and eight NAVLink feeds listed in `web/src/lib/glossary.ts` | Fund tokens: real ones only transfer between issuer-approved wallets |
| USDC on Arc, all Earlyout contracts, the Arkiv book | Issuer contract: same reason |
| The CRE workflow and its report path | Issuer status API: in production this is the issuer's attestation |

## Arkiv

The Book screen reads only from Arkiv. Writer wallet: `0x343F684dAFFf216CDf38a40888662148eBa07Fd7` on Rabdi (chain 7794095).

Query the book yourself:

```bash
cd web && pnpm install && pnpm arkiv:query
```

It runs `select().from(earlyout.claims).where(eq("status","open")).ownedBy(writer).orderBy(asc("settleAt"))` against the public RPC (`web/scripts/arkiv-query.ts`). Judging files: [`arkiv/schema.md`](arkiv/schema.md), [`friction.md`](arkiv/friction.md), [`reach.md`](arkiv/reach.md), [`why-arkiv.md`](arkiv/why-arkiv.md), [`how-you-use-arkiv.md`](arkiv/how-you-use-arkiv.md).

## Chainlink CRE

`cre/nav-bridge`: cron trigger; for each of the ten listed funds, `latestRoundData()` and `decimals()` from its mainnet NAV feed, GET `/api/issuer-status`, encode `(fund, nav, navDecimals, updatedAt, status)`, `writeReport` to NavOracle on `arc-testnet`. Simulation output is in [`cre/README.md`](cre/README.md).

## Repository layout

| Path | Contents |
|---|---|
| `contracts/` | Foundry project: `src`, `test`, `script/Deploy.s.sol`, `deployments/` |
| `web/` | Next.js app and API routes; Arkiv indexer in `src/server/arkiv/`; NAV pusher in `src/server/nav.ts` |
| `cre/` | Chainlink CRE project and the nav-bridge workflow |
| `studio-app/` | The app Arc Studio built in its own workspace against the deployed contracts (source pulled with `arc-studio pull`; it runs in the Studio preview) |
| `arkiv/` | Arkiv judging files |
| `docs/` | `spec.md`, `build-plan.md`, `ai-usage.md`, `studio/` |
| `scripts/check.sh` | Local CI gate: forge test, lint, typecheck, build |

## Run it

```bash
cd web && cp .env.example .env.local   # fill in addresses, or NEXT_PUBLIC_MODE=mock for demo data
pnpm install && pnpm dev
```

Contracts: `cd contracts && forge test`. Deploy: `forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast` with `NEW_OWNER` set.

## Honest limits

- **Open finding, LP gain sniping (High, found by Arc Studio's review).** Claims sit in the vault at cost and the whole gain lands when `settle` runs, so capital that deposits just before a settlement and leaves right after takes a share of a gain earlier LPs funded. Reproduced in `docs/studio/poc/`. Accepted for the testnet demo, where the vault holds a few USDC. The fix before any real money is linear accrual of claim value to the payout date inside `totalAssets()`; the design is in `docs/studio/02-security-review.md`.
- While a wallet we control is the oracle forwarder, it can overwrite a status with a same-timestamp report. This ends when the CRE forwarder takes over.
- Settlement needs a keeper to call `settle` at maturity. Nothing settles on its own.
- The demo switches on the Status screen act on the stand-in issuer, testnet only, and can be gated with `DEMO_TOKEN`.
- Ten listings fill FundRegistry's limit of ten. Earlyout is for funds that redeem on a schedule (ACRED, and ACREDd as its 15-minute demo). The other eight already pay within days, so the app shows them for comparison and does not offer to buy them; their payout terms on Arc are illustrative. The contract itself would still quote them if called directly.
- The CRE broadcast logs below predate the eight new funds; `cre/nav-bridge/config.*.json` now carries all ten.

## Build timeline

We built and reviewed locally and committed in topic-sized batches, so most commits carry two timestamps on the evening of 6 November. The work itself is timestamped independently on Arc, Arkiv, Vercel and GitHub, and anyone can check it:

| Time (IST) | What happened | Proof |
|---|---|---|
| 5 Nov, 21:00 | Hacking starts at ETHGlobal Mumbai | event schedule |
| 6 Nov, 16:47 | Repository created: licence, README, build spec, Arkiv friction log | [first commits](https://github.com/ETH-Global-Mumbai-2026/earlyout/commits/main) |
| 6 Nov, about 20:45 | Contracts sent into our Arc Studio project; Studio installs dependencies, runs the suite and its security review, fixes five Medium findings | `docs/studio/01-review-and-test.md`, `02-security-review.md` |
| 6 Nov, about 21:00 | First deployment of the web app to Vercel | Vercel deployment list |
| 6 Nov, 21:42 | First deploy to Arc Testnet from our own wallet with forge (later superseded) | [tx](https://explorer.testnet.arc.io/tx/0x521ed165a9b18589b7ba634a2c3d64e94e96ba3ae5713cd3d4b5754c562d2fb5) |
| 6 Nov, 22:09 | Arc Studio deploys and configures all contracts from a Circle developer-controlled wallet: 34 transactions | [first tx](https://explorer.testnet.arc.io/tx/0xaee277c5d705aa62343818e0d7e3a1e8d41736d17cfc072e3f854620c2f5a1aa), `docs/studio/04-deployment-transactions.md` |
| 6 Nov, 22:51 | First real sale through `depositAndSell` | [tx](https://explorer.testnet.arc.io/tx/0x12aefa9df1553daadc4c026566387f0fdde7cf9af6a0153a5eac5e141973a5ee) |
| 6 Nov, 22:58 | Deployed backend pushes the Chainlink ACRED NAV to the oracle | [tx](https://explorer.testnet.arc.io/tx/0x2487d33f9c961ad1065d47296f9de53314a5ce8ba622818391a7452c70948c3f) |
| 6 Nov, 23:11 | Settlement of the demo claim; LP share price rises to 1.011360 | [tx](https://explorer.testnet.arc.io/tx/0x93ef49119e451814a6a8fbc88035459404d375377b23af1583bf3fe990dcf008) |
| 6 Nov, 23:11 | First entities written to Arkiv | [tx](https://rabdi.explorer.arkiv.network/tx/0x30c138ad4af752e5e6b19eb49e0e730a3917aab532ee8274a5d5b952e95e615a) |
| 6 Nov, 23:14 to 23:16 | Three CRE broadcasts: issuer OK, FAILED, restored | [OK](https://explorer.testnet.arc.io/tx/0xbeb579c3af949e857109a542ee9a03374f853dd7399062f2f7cd9ab7dba5622f), [FAILED](https://explorer.testnet.arc.io/tx/0x4fd0f3d19eb5b105d84696f71fa9fae2b026a0df552e03dd827e31986b2c5df7), [restored](https://explorer.testnet.arc.io/tx/0xc2ba3ffbce7b1d6543bc80251919a17446fe9de133f3670cd44a5875a5b2540f) |
| 6 Nov, 23:18 and 23:33 | Reviewed work committed in topic-sized commits; CI passes | GitHub Actions runs |
| 7 Nov, 00:00 | Arc Studio builds an app in its own workspace against the deployed contracts | `studio-app/`, `docs/studio/05-studio-web-app.md` |
| 7 Nov, about 02:00 | Arc Studio deploys eight more fund stand-ins, each priced from its own Chainlink NAV feed | [first tx](https://explorer.testnet.arc.io/tx/0x50ce522234e26b921cd7e8c42d48f682fced7e8ec2eefe750cda961ac919cd50), `docs/studio/06-more-funds.md` |
| 7 Nov, about 02:10 | Ops wallet lists them in FundRegistry and reports their Chainlink NAVs | [first listing](https://explorer.testnet.arc.io/tx/0xf2a12e5d056e8790fffa0bb6d041b0f136a80c93c4ea4c593b3775afa4949918) |

From 7 November on, work is committed as it happens.

## For the submission form

**Arc, Best Smart Contracts with Advanced Stablecoin Logic in Arc Studio.** Seven contracts implement a multi-step USDC settlement: a holder's redemption becomes an ERC-1155 claim, the ERC-4626 vault buys it in the same transaction at NAV minus a four-term spread, collects USDC from the issuer at the payout date, and writes a failed fund down for every LP in one transaction. Conditional logic is on chain: every quote returns BUY, REFUSE or HALT from exposure caps, idle USDC, NAV staleness and issuer status. The contracts were tested and security-reviewed in Arc Studio (63 tests, five Medium findings fixed), deployed from a Circle developer-controlled wallet that Studio created, and connected to the web app at earlyout.vercel.app and to a Studio-built app in the project. Circle tools used: USDC on Arc, Circle Wallets (developer-controlled deployer), Arc Studio and its CLI. Feedback: Studio's deploy action creates one contract at a time and cannot run a Foundry script with follow-up calls, and Arc's USDC calls a blocklist precompile that Foundry's local simulation cannot execute, so any script that moves USDC fails in simulation.

**Arkiv, Build on Arkiv (from scratch).** The public book of open claims lives on Arkiv. Each sale on Arc becomes an entity that expires at its payout date; a fund directory expires a day after its last refresh; NAV history is kept for 30 days. The Book screen reads only from Arkiv, filtered to our writer wallet. Feedback is in `arkiv/friction.md`; the main point: a named schema does not stop another wallet writing entities under it, so every read must filter by owner.

**Chainlink, Best workflow with CRE.** `cre/nav-bridge` reads the Chainlink NAV feed of each of the ten listed funds on Ethereum mainnet (ACRED, plus eight NAVLink feeds such as Janus Henderson's JAAA) and our issuer status API, and writes a signed report to NavOracle on Arc through the Keystone forwarder. The vault halts on what it writes. Simulated with `--broadcast` three times, including the failure path; logs in `cre/README.md`. Feedback: simulating with `--broadcast` against Arc worked first time once the oracle pointed at the mock forwarder. One snag: zod's `z.string().url()` in our config schema rejected a valid https URL inside the workflow runtime, which surfaced only as "Invalid URL" at engine start; a plain regex works.

## How we used AI

See [`docs/ai-usage.md`](docs/ai-usage.md) for the file-by-file record. In short: Arc Studio's agent reviewed, tested and deployed the contracts; Claude Code (Fable 5.1) wrote the contracts' first draft, the web app, the indexer, the CRE workflow and these documents under our direction; every design decision, prompt and check was ours.

## Licence

MIT.
