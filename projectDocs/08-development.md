# 08. Development

## Prerequisites

| Tool | Used for | Notes |
|---|---|---|
| Node.js 22 (22.10 or later for `pnpm arkiv:query`) | Web app, scripts | CI uses Node 22. Scripts use `--experimental-strip-types` |
| pnpm | Web app | `packageManager` pins pnpm 12.4.2; CI installs pnpm 10 |
| Foundry | Contracts | Installs to `~/.foundry/bin`; add it to `PATH` or call it by full path |
| Bun | CRE workflow dependencies | |
| CRE CLI | Simulating `nav-bridge` | `curl -sSL https://app.chain.link/cre/install.sh \| bash`, then `cre login` |

## Machine etiquette

This is developed on a personal laptop. Run the narrowest check that can fail while iterating: one test file, one Playwright spec on one device project, `pnpm typecheck` alone. Full suites (`forge test` with no filter, all Playwright projects, `scripts/check.sh`) run once, right before an approved push. Never start a second heavy job while one is running. Development servers are started by the owner, not by tools or agents.

## Web app in mock mode

No chain, wallet or keys needed.

```bash
cd web
pnpm install
cp .env.example .env.local      # then set NEXT_PUBLIC_MODE=mock
pnpm dev
```

Mock mode gives two funds (ACRED and ACREDd), a connected fake wallet with 250 USDC and 2 units of each fund, an in-memory vault, a sample Book, and demo switches that work without a key. See [07-web-app.md](07-web-app.md#mock-and-chain-mode).

## Web app against Arc testnet

```bash
cd web
cp .env.example .env.local
pnpm sync-addresses             # contract addresses and ARC_DEPLOY_BLOCK from ../contracts/deployments/arc-testnet.json
pnpm dev
```

Reads work with only the public addresses. Selling needs a wallet allowlisted on the fund token and on ClaimToken, holding fund tokens and some USDC for gas (the "Try as judge" button does this through the server's ops wallet, which needs `OPS_PRIVATE_KEY`). The Book needs `ARKIV_WRITER_ADDRESS`; writing to Arkiv needs `ARKIV_WRITER_PRIVATE_KEY`. Remember that every testnet transaction spends from the shared vault and writes to the public Arkiv book the live site reads.

## Contracts

```bash
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git   # once; contracts/lib is not committed
forge build
```

Run one test file or one test at a time:

```bash
forge test --match-path test/Vault.t.sol
forge test --match-contract ReviewFixesTest -vv
forge test --match-test test_quoteIsBuyWithFourTerms -vvv
```

Check the contract names with `grep -n '^contract' test/*.t.sol` before using `--match-contract`.

After a contract change that touches the ABI the app uses:

```bash
forge build && cd ../web && pnpm check:abi
```

Read-only calls against the live deployment are safe, for example:

```bash
cast call 0x19F0c2bEec4E3520F4C49c8B28CAa9eEb7972997 "totalAssets()(uint256)" --rpc-url https://rpc.testnet.arc.io
cast call 0x19F0c2bEec4E3520F4C49c8B28CAa9eEb7972997 \
  "quoteFund(address,uint256)((uint8,string,uint256,uint64,uint16,uint16,uint16,uint16,uint256,uint256))" \
  0x8d9FF934E08DA9f8AEbF2280dAD218e8d176d06F 1000000000000000 --rpc-url https://rpc.testnet.arc.io
```

`forge script` simulation of anything that moves USDC fails locally: Arc's USDC calls a blocklist precompile that Foundry cannot execute. Deploy with the seed and issuer funding set to 0 and fund them afterwards.

## Web checks

```bash
cd web
pnpm typecheck
pnpm lint
pnpm test:unit                  # node --test over test/**/*.test.ts (redesign branch)
```

Unit tests (`web/test/`, redesign branch) cover pure helpers only: `bpsSum`, `metrics.ts`, `perUnit.ts`, `fundLogo.ts`. Modules under test must use relative imports (no `@/` alias) so Node can load them.

### Playwright

`web/playwright.config.ts`: test dir `e2e`, three device projects (`phone` iPhone 14, `tablet` iPad gen 7, `desktop` Desktop Safari at 1440×900), 2 workers, 45 s timeout. Without `E2E_BASE_URL` it builds and starts the app on port 3100 in mock mode; with it, it tests a server you already run.

Run one spec on one project:

```bash
cd web
pnpm exec playwright test e2e/flows.spec.ts --project=desktop
pnpm exec playwright test e2e/flows.spec.ts -g "Sell" --project=desktop
E2E_BASE_URL=http://localhost:3200 pnpm exec playwright test e2e/chrome.spec.ts --project=phone
```

With a dev server, use `localhost` rather than `127.0.0.1`: Next 16 dev blocks cross-origin dev resources from `127.0.0.1`, so pages never hydrate.

| Spec | Covers |
|---|---|
| `e2e/flows.spec.ts` | Sell (verdict before anything moves, refuse above cap, more than held), Vault deposit and withdraw, Status (issuer failure halts quotes, writedown), Book, site pages, responsive overflow and navigation |
| `e2e/chrome.spec.ts` | Redesign: testnet strip, old-link redirects, site menu closes on Escape and navigation |
| `e2e/theme.spec.ts` | Redesign: dark preference on first paint, light canvas and serif face |
| `e2e/home.spec.ts` | Redesign: hero per-unit quote and verdict, days skipped, reduced motion, audience doors |

All Playwright runs use mock mode; none sends a testnet transaction.

## CRE workflow

```bash
cd cre/nav-bridge && bun install && bun run typecheck && cd ..
cre workflow simulate ./nav-bridge --target staging-settings --limits default --non-interactive --trigger-index 0
```

Without `--broadcast` the run is a dry run and prints zero transaction hashes. A broadcast run sends real transactions on Arc testnet and needs the oracle pointed at the simulation forwarder first; see [05-oracle-and-cre.md](05-oracle-and-cre.md#simulating).

## Arkiv

```bash
cd web && pnpm arkiv:query
```

Reads only; uses the public Rabdi RPC.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` and on every pull request.

| Job | Steps |
|---|---|
| `contracts` | Install Foundry, `forge install` forge-std and OpenZeppelin v5.7.0, `forge build --sizes`, `forge test -vv` |
| `web` | pnpm 10, Node 22 with pnpm cache, `pnpm install --frozen-lockfile`, `pnpm check` (lint and typecheck), `pnpm build` with `NEXT_PUBLIC_MODE=mock` |

CI does not run the unit tests, Playwright, `check:abi` or the CRE typecheck.

### Local gate

`scripts/check.sh` mirrors CI: `forge build` and the full `forge test`, then `pnpm check` and a mock-mode `pnpm build`. It is heavy; run it once, in the foreground, right before pushing.

## Conventions

- Commits: one logical change each, a single conventional subject line (`type: short summary`), no body. PRs merge with merge commits.
- Filenames: PascalCase for components, camelCase for lib, hooks and server files.
- User-facing text never uses an em dash or an en dash as a dash. Rewrite the sentence by hand; never with a global replace. Repo docs and code comments are exempt.
- Never print or commit a private key; `.env` and `.env.*` (except `.env.example`) are git-ignored.
