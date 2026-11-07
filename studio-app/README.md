# Earlyout

Early exit for tokenized funds that redeem on a schedule. A holder deposits a fund token, receives a claim on the pending redemption, and sells it for USDC today at NAV minus a priced spread. Liquidity providers fund the vault and earn the spread.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- Solidity 0.8.28, Foundry, OpenZeppelin Contracts 5.7.0 (vendored in `lib/`)
- Arc Testnet, USDC (6 decimals)
- Web app scaffold: React, Vite, TypeScript, Tailwind, wagmi, viem

## Development

Prerequisites: [Foundry](https://book.getfoundry.sh) and [Bun](https://bun.sh).

```bash
bun install
bun run contracts:build   # forge build
bun run contracts:test    # forge test
bun run dev               # web app
```

The web app (one screen) reads the deployed Arc Testnet contracts listed in `contracts/deployments/arc-testnet.json`: pick a fund, enter an amount, see the live vault quote with its four spread terms, and sell the claim from a connected wallet. The vault panel shows total assets, idle USDC, deployed USDC and the share price. Reading works without a wallet; selling needs a wallet on the fund and claim allowlists.

Security review notes: `../docs/studio/02-security-review.md`.

### Environment variables

Read by the deploy script `contracts/script/Deploy.s.sol` (all optional):

- `NEW_OWNER`: address that takes ownership and the oracle forwarder role after deploy
- `DEMO_HOLDER`: address that receives demo fund tokens
- `EXPOSURE_CAP_USDC`: per-fund exposure cap, whole USDC
- `VAULT_SEED_USDC`: vault seed deposit, whole USDC
- `ISSUER_FUND_USDC`: USDC pre-funded to the issuer stand-in, whole USDC
- `INITIAL_NAV_8DP`: starting NAV with 8 decimals

The web app reads none.
