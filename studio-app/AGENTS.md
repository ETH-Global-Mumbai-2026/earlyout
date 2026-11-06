# [App Name]

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

[Brief description of what the app does and its primary use case]

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## Share links

- Starter apps already ship `getShareBase`, `buildShareLink` and `installShareSync` in `src/lib/share.ts`; import them instead of rewriting them.
- Keep shareable state in the URL path or query, not in the `#fragment`.
- Never put a secret (private key, claim secret, seed phrase, session token, API key) in the URL path or query, encoded or not: every in-app path and query is mirrored to the visitor's studio.arc.io address bar and browser history and reaches servers. A bearer claim secret goes only in the `#fragment` appended to the share link (`` `${await buildShareLink('/claim')}#${secret}` ``) and is read from `location.hash` on load. A link to the app's own share URL shown inside the app must be copy-only or open in a new tab with `target="_blank" rel="noopener noreferrer"`.
- Build every link a user copies or sends with `buildShareLink()` from `src/lib/share.ts`.
- Keep the `installShareSync()` call in `src/main.tsx` when editing it; it keeps the Studio address bar in step with in-app navigation.
- Navigate inside the app with relative links.

## To Run

```bash
bun install
bun run dev
```

## Contracts (Earlyout)

- Seven contracts in `contracts/`: FundRegistry, NavOracle, IssuerStub, ClaimToken, ClaimWrapper, FundToken, Vault. Tests in `contracts/test/`, deploy script in `contracts/script/Deploy.s.sol`.
- OpenZeppelin Contracts 5.7.0 is vendored in `lib/openzeppelin-contracts/contracts/` and mapped in `foundry.toml` and `remappings.txt`.
- `context/abi.ts` is the interface the app and indexer consume. Do not change any signature in it.
- Security review: `docs/studio-review.md`. One High finding (LP gain sniping around settlement) is open pending a decision.
- Nothing is deployed yet.

## Deployment (Arc Testnet, chain 5042002)

Deployed with `scripts/deploy-earlyout.ts` (mirrors `contracts/script/Deploy.s.sol`), from the developer-controlled wallet 0xC9007Afa7c9eCd6b0D9da62e3B820f69F730aFf3. All eight contracts and the oracle forwarder were handed to 0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B. Addresses and tx hashes: `contracts/deployments/arc-testnet.json` and `contracts/deployments/.earlyout-state.json`.
The vault is not seeded and the issuer stand-in is not funded (VAULT_SEED_USDC=0, ISSUER_FUND_USDC=0): `quoteFund` returns REFUSE ("Vault short of USDC") until the owner wallet deposits USDC into the Vault and sends USDC to IssuerStub.

## Web app

- `src/App.tsx` composes `src/components/` (FundPicker, AmountInput, QuotePanel, SellButton, VaultPanel). Contract addresses and ABIs live in `src/lib/earlyout.ts`, which imports addresses from `contracts/deployments/arc-testnet.json` (so a redeploy only needs that file updated).
- Selling calls `ClaimWrapper.depositAndSell` with minPayout = 99.5% of the quote, after an exact-amount allowance to ClaimWrapper if needed. Only wallets on the fund token and ClaimToken allowlists can sell.
