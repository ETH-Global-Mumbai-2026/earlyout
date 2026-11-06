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
    feed[Chainlink ACRED NAV feed]
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

USDC on Arc: `0x3600000000000000000000000000000000000000`. Deployed at block 71057910 from `0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3` and owned by `0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B`. Explorer: https://explorer.testnet.arc.io.

Contracts were drafted by our agent, then installed, tested, security-reviewed and fixed in Arc Studio (five Medium findings fixed; prompts and the full report in `docs/studio/`), and pulled into `contracts/` with `arc-studio pull`. 63 Foundry tests. Deployed by Arc Studio from a Circle developer-controlled wallet created in the Studio workspace (`0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3`), following `script/Deploy.s.sol` step by step. The final transactions hand ownership of all eight contracts and the oracle forwarder role to our ops wallet, so the deployer owns nothing. All 34 transactions are listed in `docs/studio/04-deployment-transactions.md`.

## What is real and what is a stand-in

| Real | Stand-in, and why |
|---|---|
| Fund NAV: Chainlink "ACRED NAV" feed on Ethereum mainnet, `0x35DDfB90011E686CCf837a6819562705076207EB`, 8 decimals | Fund tokens: real ones only transfer between issuer-approved wallets |
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

`cre/nav-bridge`: cron trigger, `latestRoundData()` and `decimals()` from the mainnet feed, GET `/api/issuer-status`, encode `(fund, nav, navDecimals, updatedAt, status)`, `writeReport` to NavOracle on `arc-testnet`. Simulation output is in [`cre/README.md`](cre/README.md).

## Repository layout

| Path | Contents |
|---|---|
| `contracts/` | Foundry project: `src`, `test`, `script/Deploy.s.sol`, `deployments/` |
| `web/` | Next.js app and API routes; Arkiv indexer in `src/server/arkiv/`; NAV pusher in `src/server/nav.ts` |
| `cre/` | Chainlink CRE project and the nav-bridge workflow |
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
- Only two funds are listed. The oracle and pricing handle any feed decimals; adding a fund is one registry call.

## How we used AI

See [`docs/ai-usage.md`](docs/ai-usage.md) for the file-by-file record. In short: Arc Studio's agent reviewed, tested and deployed the contracts; Claude Code (Fable 5.1) wrote the contracts' first draft, the web app, the indexer, the CRE workflow and these documents under our direction; every design decision, prompt and check was ours.

## Licence

MIT.
