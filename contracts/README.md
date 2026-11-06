# Earlyout contracts

Foundry project. Written, tested and security-reviewed in Arc Studio (prompts and the review report are in `../docs/studio/`), pulled here with `arc-studio pull`.

```bash
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git
forge test
```

Deploy to Arc testnet (the deployer needs test USDC, which is also gas):

```bash
NEW_OWNER=0x... DEMO_HOLDER=0x... EXPOSURE_CAP_USDC=20 VAULT_SEED_USDC=5 ISSUER_FUND_USDC=10 \
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Addresses are written to `deployments/arc-testnet.json`; `pnpm sync-addresses` in `../web` copies them into the app's env.

| Contract | Job |
|---|---|
| FundToken | Stand-in fund share, allowlisted transfers |
| FundRegistry | Listed funds and pricing terms, max 10 |
| NavOracle | Chainlink CRE receiver: NAV, timestamp, issuer status; optional workflow pinning |
| IssuerStub | Stand-in issuer: queues redemptions, pays NAV after the delay, can be set to failed |
| ClaimToken | ERC-1155 claims, one id per fund and payout date |
| ClaimWrapper | deposit, depositAndSell, collect, redeem |
| Vault | ERC-4626 over USDC: quote, quoteFund, sell, buy, settle, markImpaired, clearImpaired |
