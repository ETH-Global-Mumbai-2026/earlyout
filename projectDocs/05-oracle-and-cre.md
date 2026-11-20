# 05. Oracle and CRE

Every price and every HALT in Earlyout comes from one record per fund in `NavOracle`: NAV, timestamp, issuer status. Two writers can produce that record, using the identical report format, so the contracts cannot tell them apart:

| Writer | Code | Signs as | When |
|---|---|---|---|
| Chainlink CRE workflow `nav-bridge` | `cre/nav-bridge/main.ts` | The CRE forwarder | During simulations with `--broadcast` (the oracle's forwarder must point at the simulation forwarder) |
| Server NAV pusher | `web/src/server/nav.ts`, `/api/nav/push` | The ops wallet | Daily by Vercel cron, and on demand from the Oracle and risk screen; only while the ops wallet is the forwarder |

Today the oracle's forwarder is the ops wallet, so the server pusher is the live writer. Moving NAV to CRE is one `setForwarder` call.

## Report encoding

```solidity
report = abi.encode(address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status)
```

| Field | Meaning |
|---|---|
| `fund` | The fund token address on Arc |
| `nav` | The feed's `answer`, in the feed's own decimals |
| `navDecimals` | The feed's decimals (6, 8 or 18 for the current feeds); at most 36 |
| `updatedAt` | The feed's `updatedAt` (unix seconds), not the time of the write |
| `status` | 0 OK, 1 FAILED |

`metadata` is the CRE forwarder metadata, `abi.encodePacked(bytes32 workflowId, bytes10 workflowName, address workflowOwner, bytes2 reportId)`. It is only read when workflow pinning is on. The server pusher sends empty metadata (`0x`).

## NavOracle checks

`onReport` runs these in order and reverts on the first failure:

| # | Check | Error |
|---|---|---|
| 1 | `msg.sender == forwarder` | `InvalidSender(sender)` |
| 2 | If `expectedWorkflowOwner` or `expectedWorkflowId` is set: metadata is at least 62 bytes, `metadata[0:32]` equals the expected id, `metadata[42:62]` equals the expected owner | `BadMetadata`, `InvalidWorkflowId`, `InvalidWorkflowOwner` |
| 3 | `status` is 0 or 1 | `BadStatus` |
| 4 | `navDecimals <= 36` | `BadDecimals` |
| 5 | `updatedAt >= stored updatedAt` (equal is accepted, so a status change can land between NAV updates) | `StaleReport` |
| 6 | `updatedAt <= block.timestamp + MAX_FUTURE_DRIFT` (5 minutes) | `FutureReport` |

Then NAV is normalised to 18 decimals (`nav × 10^(18 − d)` or `nav / 10^(d − 18)`), stored with `updatedAt` and `status`, and `NavUpdated(fund, nav, updatedAt, status)` is emitted.

Why each rule exists:

- **Forwarder only.** One address may write.
- **Workflow pinning** (review fix M3). The CRE forwarder is shared by every workflow on the network, so the sender check alone does not say whose report it is. Pinning is off by default so the server pusher and the permissionless simulation forwarder keep working. It must be set before the forwarder points at the deployed KeystoneForwarder.
- **Older reports rejected.** A delayed report cannot roll the NAV back.
- **Future-dated reports rejected** (review fix M2). A report stamped far ahead (for example milliseconds sent as seconds) would otherwise become the stored lower bound and block every later correction.

## How the vault uses the record

- `nav == 0` or older than the fund's `maxAge` (96 hours for every fund today): HALT "NAV is stale".
- `status == FAILED`: HALT "Issuer reports failure", and `markImpaired(fund)` becomes callable.
- `updatedAt` may sit up to 5 minutes ahead of `block.timestamp`; the vault never subtracts blindly.
- `IssuerStub.settle` refuses to pay on a missing, stale or FAILED NAV, so a settlement can be retried once a fresh report lands (review fix M4).

## The `nav-bridge` workflow

Location: `cre/nav-bridge/`. TypeScript, `@chainlink/cre-sdk` ^1.6.0, viem, zod. Project settings in `cre/project.yaml` (RPCs for `ethereum-mainnet` and `arc-testnet`), workflow settings in `cre/nav-bridge/workflow.yaml` (targets `staging-settings` and `production-settings`, config files `config.staging.json` and `config.production.json`, which are currently identical).

Trigger: cron, `"0 0 * * * *"` (hourly, at minute 0). For each configured fund, inside its own try/catch:

1. **Read the feed** on Ethereum mainnet with `EVMClient.callContract`, `latestRoundData()` at `LAST_FINALIZED_BLOCK_NUMBER`. A non-positive answer throws. Feed decimals come from config (`feedDecimals`) rather than a second read, which keeps ten funds inside CRE's per-execution read limit.
2. **Ask the issuer status API** with `HTTPClient` in node mode: `GET {issuerStatusUrl}?fund={fund}`, consensus with `consensusIdenticalAggregation`. The body must be JSON with `status` equal to `OK` or `FAILED`, otherwise the fund is skipped.
3. **Encode** `(fund, nav, navDecimals, updatedAt, status)`, sign it with `runtime.report` (encoder `evm`, ECDSA, keccak256) and call `writeReport` to `oracleAddress` on Arc with `gasLimit` from config (400,000). A non-success status throws.

If anything fails for one fund, the workflow logs `{symbol}: skipped, …` and moves on. On an issuer API outage nothing is reported for that fund: its NAV ages and the vault halts it after `maxAge`, which is safer than guessing.

Config fields: `schedule`, `feedChainName`, `arcChainName`, `oracleAddress` (`0xCd55924a73771d508887905473d93B981ac4A08b`), `issuerStatusUrl` (`https://earlyout.vercel.app/api/issuer-status`), `gasLimit`, and `funds[]` of `{symbol, fund, feed, feedDecimals}`. URLs are validated with a regex, not `z.string().url()`, which rejected valid URLs inside the workflow runtime.

### Feeds (Ethereum mainnet)

| Fund | Chainlink feed | Decimals |
|---|---|---|
| ACRED, ACREDd | `0x35DDfB90011E686CCf837a6819562705076207EB` | 8 |
| JAAA | `0x3BbccB2301759D2e4A5692bA72DAb4b75dC43B1a` | 6 |
| JTRSY | `0x0C2e4Df738e99e8db80012f5bb2a303f3f48Ca74` | 6 |
| USTB | `0x289B5036cd942e619E1Ee48670F98d214E745AAC` | 6 |
| USCC | `0xAfFd8F5578E8590665de561bdE9E7BAdb99300d9` | 6 |
| USTBL | `0x477e363c51Ab0C4D13B22CD6B57D56d4a3Cb7Abe` | 6 |
| SAFO | `0xC1E5FA6d48ba11cA163b03f2aBf843471eB7B2fB` | 6 |
| CASH+ | `0x66C0dB1A21047f0c156d2F39b33B1A47E9fE4583` | 18 |
| Treasury+ | `0x0c829741d2D2e2536FA1D59E283c8771516fE0cd` | 18 |

The same list, with issuer names, is `CATALOG` in `web/src/lib/glossary.ts`.

### Forwarders on Arc testnet

| Use | Address |
|---|---|
| Simulation (MockKeystoneForwarder) | `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` |
| Deployed workflows (KeystoneForwarder) | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |

### Simulating

```bash
cd cre/nav-bridge && bun install && cd ..
cp .env.example .env        # CRE_ETH_PRIVATE_KEY: an Arc testnet key funded with test USDC
cre login

# Dry run, all ten funds, production quotas enforced, no transactions
cre workflow simulate ./nav-bridge --target staging-settings --limits default --non-interactive --trigger-index 0

# Real run through the simulation forwarder: point the oracle at it first, and back afterwards
cast send 0xCd55924a73771d508887905473d93B981ac4A08b "setForwarder(address)" 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 --rpc-url https://rpc.testnet.arc.io --private-key $OPS_PRIVATE_KEY
cre workflow simulate ./nav-bridge --target staging-settings --broadcast
cast send 0xCd55924a73771d508887905473d93B981ac4A08b "setForwarder(address)" 0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B --rpc-url https://rpc.testnet.arc.io --private-key $OPS_PRIVATE_KEY
```

Requires the CRE CLI (1.0.7 or later; Arc needs TS SDK 1.3.1 or later per `cre/README.md`) and Bun. While the forwarder is the simulation forwarder anyone can deliver a report through it, so keep that window short.

Recorded runs (6 November 2026): issuer OK `0xbeb579…`, issuer FAILED `0x4fd0f3…`, restored `0xc2ba3f…`, plus a ten-fund dry run on 7 November. Full logs and hashes are in `cre/README.md`.

## The server NAV pusher

`web/src/server/nav.ts`, exposed as `GET` or `POST /api/nav/push`.

1. Refuses unless authorised: `Authorization: Bearer <CRON_SECRET>` (Vercel cron) or `x-demo-token: <DEMO_TOKEN>` (the Refresh NAV button). Both compare in constant time and fail closed when unset. In mock mode it returns `{"mode":"mock","results":[]}`.
2. Refuses if the ops wallet's native balance is below 2 USDC (`OPS_RESERVE`).
3. Reads `IssuerStub.failed()` for the status.
4. Checks that `NavOracle.forwarder()` is the ops wallet; otherwise it throws ("CRE may already own it").
5. For each `fund:feed` pair in `FUND_FEEDS`, reads `latestRoundData`, `decimals` and `description` on mainnet (`ETH_RPC`, default `https://ethereum-rpc.publicnode.com`, latest block), encodes the same report and calls `onReport("0x", report)`, waiting for each receipt.

Response:

```json
{
  "mode": "chain",
  "results": [
    { "fund": "0x…", "feed": "<feed description>", "nav": "111261277000", "decimals": 8, "updatedAt": 1794526535, "status": "OK", "hash": "0x…" }
  ]
}
```

Differences from the CRE workflow: it reads at the latest block rather than the last finalized one, reads `decimals()` from the feed instead of config, sends no metadata, and covers whichever funds `FUND_FEEDS` lists (the Vercel value is not in the repo, so which funds the daily cron covers could not be verified here; the live NAVs for all ten funds were less than a day old on 13 November 2026).

## The issuer status API

`GET /api/issuer-status?fund=0x…` returns

```json
{ "status": "OK", "fund": "0x…", "source": "IssuerStub on Arc testnet", "at": "2026-11-13T00:00:00.000Z" }
```

It reflects `IssuerStub.failed()` (cached 5 seconds, last good value for up to 5 minutes if Arc rate-limits). The `fund` parameter is echoed; one status covers every fund because there is one stand-in issuer. `POST {"failed": true|false}` with `x-demo-token` flips the stub (owner call from the ops wallet). Flipping the stub does not change the oracle by itself: the new status reaches NavOracle on the next report from either writer.

## Known weaknesses

- While the ops wallet is the forwarder it can write any NAV or status, including a same-timestamp report that overwrites a status (equal `updatedAt` is accepted).
- With the simulation forwarder, anyone can deliver a report. Workflow pinning must not be set while using it (its metadata is not meaningful).
- Before pointing at the deployed KeystoneForwarder, call `setExpectedWorkflowOwner` (and ideally `setExpectedWorkflowId`, which changes on every workflow redeploy).
