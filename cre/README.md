# Chainlink CRE: the NAV bridge

One workflow, `nav-bridge`, on a cron trigger. For each configured fund (ten since 7 November: ACRED, ACREDd and eight funds with Chainlink NAVLink feeds) it reads that fund's Chainlink NAV feed on Ethereum mainnet, asks the issuer status API, and writes a signed report to NavOracle on Arc testnet through the Keystone forwarder. The report encoding is `abi.encode(address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status)`, the same one the stand-in pusher in `web/src/server/nav.ts` uses, so the contracts cannot tell the two apart.

## Run it

```bash
curl -sSL https://app.chain.link/cre/install.sh | bash   # CLI 1.0.7 or later; Arc needs TS SDK 1.3.1+
cre login
cd cre/nav-bridge && bun install && cd ..
cp .env.example .env                                     # CRE_ETH_PRIVATE_KEY, funded with Arc test USDC
```

Edit `nav-bridge/config.staging.json`: `oracleAddress` and each fund's `fund` address from `contracts/deployments/arc-testnet.json` (ACRED, ACREDd) and `contracts/deployments/arc-testnet-funds.json` (the other eight), each feed's `feedDecimals`, and `issuerStatusUrl` to the deployed app.

Point the oracle at the simulation forwarder, then simulate with a real transaction:

```bash
cast send $NAV_ORACLE "setForwarder(address)" 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 --rpc-url https://rpc.testnet.arc.io --private-key $DEPLOYER_PRIVATE_KEY
cre workflow simulate ./nav-bridge --target staging-settings --broadcast
```

Without `--broadcast` the run is a dry run and reports an empty transaction hash. With it, the simulator's MockKeystoneForwarder on Arc delivers the report, NavOracle emits `NavUpdated`, and the app's Status screen shows the new timestamp.

To hand the oracle back to the server-side pusher: `setForwarder(<ops wallet>)`.

## Forwarders on Arc testnet

| Use | Address |
|---|---|
| Simulation (MockKeystoneForwarder) | `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` |
| Deployed workflows (KeystoneForwarder) | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |

## Last simulation

Three `cre workflow simulate ./nav-bridge --target staging-settings --broadcast` runs on 6 Nov 2026, CLI v1.39.0, against production's issuer status API (`https://earlyout.vercel.app/api/issuer-status`). Each report went through the MockKeystoneForwarder on Arc testnet and NavOracle emitted `NavUpdated`.

**Run 1, issuer OK:**
```
ACRED: nav=111377320000 dec=8 updatedAt=1793916047 status=OK
ACRED: NavOracle updated on Arc, tx 0xbeb579c3af949e857109a542ee9a03374f853dd7399062f2f7cd9ab7dba5622f
ACREDd: nav=111377320000 dec=8 updatedAt=1793916047 status=OK
ACREDd: NavOracle updated on Arc, tx 0xd8e0d5f133a3ce41d882a4a48fe33035237bbd344fa0e40eae0f9165568fc103
```

**Run 2, after flipping the issuer to FAILED in the app.** The vault's quote for the demo fund then returned HALT, "Issuer reports failure":
```
ACRED: nav=111377320000 dec=8 updatedAt=1793916047 status=FAILED
ACRED: NavOracle updated on Arc, tx 0x4fd0f3d19eb5b105d84696f71fa9fae2b026a0df552e03dd827e31986b2c5df7
ACREDd: nav=111377320000 dec=8 updatedAt=1793916047 status=FAILED
ACREDd: NavOracle updated on Arc, tx 0x4c21961fc6f9ede42d473e0cae739709b6e313acdf24b4c8f4faa65a7e06ee9b
```

**Run 3, issuer restored:**
```
ACRED: nav=111377320000 dec=8 updatedAt=1793916047 status=OK
ACRED: NavOracle updated on Arc, tx 0xc2ba3ffbce7b1d6543bc80251919a17446fe9de133f3670cd44a5875a5b2540f
ACREDd: nav=111377320000 dec=8 updatedAt=1793916047 status=OK
ACREDd: NavOracle updated on Arc, tx 0xeca23a15be998130a033842abd04609cc198a5829405a03319ddc69c699c5875
```

The oracle's forwarder was then set back to the ops wallet so the app's Refresh NAV button keeps working. Pointing it at the simulation forwarder again (one `setForwarder` call) hands NAV back to CRE.

## Ten funds under production limits

On 7 November the workflow was cut to one EVM read per fund (feed decimals never change, so they now come from config as `feedDecimals`), reads at the last finalized block, runs hourly, and wraps each fund in its own try/catch so one bad feed or one failed status call does not silence the others. On an issuer API outage nothing is reported for that fund: its NAV ages, and the vault halts it once the NAV passes the fund's maxAge, which is safer than guessing.

Dry run with all ten funds and CRE's production quotas enforced: `cre workflow simulate ./nav-bridge --target staging-settings --limits default --non-interactive --trigger-index 0` (no `--broadcast`, so transaction hashes print as zero):

```
ACRED: nav=111377320000 dec=8 updatedAt=1793916047 status=OK
ACREDd: nav=111377320000 dec=8 updatedAt=1793916047 status=OK
JAAA: nav=1055506 dec=6 updatedAt=1793986895 status=OK
JTRSY: nav=1121860 dec=6 updatedAt=1793986895 status=OK
USTB: nav=11269831 dec=6 updatedAt=1793974547 status=OK
USCC: nav=11820952 dec=6 updatedAt=1793971763 status=OK
USTBL: nav=1102123 dec=6 updatedAt=1793981435 status=OK
SAFO: nav=1027272 dec=6 updatedAt=1793979803 status=OK
CASH+: nav=110297000000000000000 dec=18 updatedAt=1793956595 status=OK
Treasury+: nav=931284400000000000000 dec=18 updatedAt=1793955395 status=OK
```

The issuer status API answers for the single stand-in issuer, so the `fund` parameter is echoed but one status covers every fund.

## Forwarder hygiene

While the oracle's forwarder is the simulation MockKeystoneForwarder, anyone can deliver a report through it. Keep the forwarder on the ops wallet except while recording a CRE broadcast, and point it back right after. Before ever pointing it at the deployed KeystoneForwarder, call `setExpectedWorkflowOwner` (and ideally `setExpectedWorkflowId`) so only this workflow's reports are accepted.
