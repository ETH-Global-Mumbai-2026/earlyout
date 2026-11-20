# Earlyout project documentation

Earlyout lets a holder of a tokenized fund that redeems on a schedule (for example Apollo's ACRED on Securitize) sell a pending redemption for USDC today. The redemption becomes an ERC-1155 claim, a USDC vault on Arc testnet buys it in the same transaction, and the vault collects from the issuer on the payout date. The price is the fund's Chainlink NAV minus a spread made of four named terms (base, vault usage, time to payout, issuer credit), and every quote leads with a verdict: BUY, REFUSE or HALT. Liquidity providers deposit USDC into the vault and earn the spread. A Chainlink CRE workflow carries NAV and issuer status to a NavOracle on Arc, and every sale is written to Arkiv as a public, self-expiring record. Earlyout was built at ETHGlobal Mumbai in November 2026, where it won Arc's "Best DeFi / Onchain Finance App" prize. It runs on Arc testnet (chain 5042002) at https://earlyout.vercel.app; the Vault is `0x19F0c2bEec4E3520F4C49c8B28CAa9eEb7972997`.

This folder is the reference for how the whole system works. The code is the source of truth: every address, parameter and function name here was taken from the code, the deployment files, the existing `docs/`, or a read-only call to Arc testnet on 13 November 2026. Where an older document and the code disagree, these pages follow the code.

## Contents

| Page | What it covers |
|---|---|
| [01-overview.md](01-overview.md) | The problem, who uses Earlyout, a sale end to end, current status, what is real and what is a stand-in |
| [02-architecture.md](02-architecture.md) | Components, data flows and trust boundaries, with diagrams |
| [03-contracts.md](03-contracts.md) | Every contract: purpose, functions, events, errors, roles, invariants, deployed addresses and live configuration |
| [04-pricing.md](04-pricing.md) | The spread formula term by term, per-fund parameters, decimals, a worked example |
| [05-oracle-and-cre.md](05-oracle-and-cre.md) | Report encoding, NavOracle checks, the `nav-bridge` CRE workflow, the server NAV pusher |
| [06-arkiv.md](06-arkiv.md) | The public book: schemas, writer, sync paths, queries, expiry |
| [07-web-app.md](07-web-app.md) | Routes, data layer, hooks, server reads, API endpoints, environment variables |
| [08-development.md](08-development.md) | Local setup, mock mode, contract and web checks, CRE simulation, CI |
| [09-deployment-and-operations.md](09-deployment-and-operations.md) | Vercel, contract deployment, wallets and roles, keeper duties, monitoring, runbooks |
| [10-security.md](10-security.md) | Threat model, trust assumptions, review findings (fixed and open), mainnet checklist |
| [11-roadmap.md](11-roadmap.md) | The redesign in progress, the parked Buy feature, what mainnet needs |
| [glossary.md](glossary.md) | Terms and abbreviations |

## How to navigate

- New to the project: read 01, then 02.
- Changing contracts: 03 and 04, then 10 before you ship anything.
- Working on prices or the oracle: 04 and 05.
- Working on the web app: 07 and 08. The app has a mock mode that needs no chain.
- Running the live testnet deployment: 09.
- Planning what comes next: 11.

## Repository map

| Path | Contents |
|---|---|
| `contracts/` | Foundry project: `src/` (7 contracts and `IReceiver`), `test/` (81 tests), `script/Deploy.s.sol` and `script/DeployVault.s.sol`, `deployments/*.json` |
| `cre/` | Chainlink CRE project with one workflow, `nav-bridge` |
| `web/` | Next.js 16 app (site, app screens, API routes), the Arkiv indexer (`src/server/arkiv/`), the NAV pusher (`src/server/nav.ts`), Playwright and unit tests |
| `arkiv/` | Arkiv schema notes and the Arkiv judging write-ups |
| `scripts/check.sh` | Local CI gate (contracts build and test, web lint, typecheck and build) |
| `studio-app/` | The small app Arc Studio built against the deployed contracts |
| `docs/` | Original spec and build plan (planning documents), demo script, AI usage record, Arc Studio prompts and outputs (`studio/`), redesign spec and plan (`superpowers/`) |
| `README.md` | The submission README, with sponsor sections and proofs |
