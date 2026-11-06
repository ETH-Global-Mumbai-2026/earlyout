# Earlyout build spec

## One line

Sell your pending fund redemption today, at a price that explains its own risks.

## Customer

Fund distributors and issuers. Real fund tokens only move between KYC-approved addresses, and distributors control that list. They bring the eligibility, Earlyout brings the liquidity.

## Flow

1. Holder deposits a listed fund token into ClaimWrapper.
2. ClaimWrapper requests redemption from the issuer and mints a claim token (one id per fund and payout date).
3. Holder sells the claim to the Vault for USDC in the same transaction.
4. Price = NAV x (1 - spread). Spread = base + utilisation + volatility x sqrt(days to settlement) + credit.
5. Buyers can purchase claims the Vault holds, at NAV minus the spread for the time remaining.
6. At settlement, a keeper collects the full amount from the issuer into the Vault.
7. If the issuer fails, trading in that fund halts and its claims are written down inside `totalAssets()`, so every LP's share price falls in one transaction.

## Architecture

```
  Ethereum mainnet: Chainlink NAV feeds         Issuer status API (stand-in)
                 \                                /
                  +--- Chainlink CRE workflow ---+
                                |
                                v
  ARC TESTNET          NavOracle (NAV, settlement date, issuer status)
                                |
  Holder -> ClaimWrapper -> ClaimToken (ERC-1155) -> Vault (ERC-4626, USDC) <- LPs
                                                       sell / buy / settle / markImpaired
                                                            |
                                     Keeper -> IssuerStub.settle() -> USDC to Vault
                                |
  ARKIV                fund, claim and bid entities (written by an indexer)
                                |
  BACKEND + WEB APP    quote API, MCP tool, demo account, proof pages, order book
```

## Contracts

| Contract | Job |
|---|---|
| FundRegistry | Listed funds and their terms: settlement delay, volatility, credit premium, exposure cap |
| NavOracle | Receives CRE reports from the authorised forwarder only; per-feed decimals; rejects stale NAV |
| IssuerStub | Stand-in issuer: queues redemptions, pays at NAV after the delay |
| ClaimToken (ERC-1155) | One id per fund and payout date; transfers only between allowlisted addresses |
| ClaimWrapper | Accepts listed funds only, requests redemption, mints claims |
| Vault (ERC-4626 over USDC) | `quote`, `sell`, `buy`, `settle`, `markImpaired`, exposure caps |

### Interface

```solidity
enum Verdict { BUY, REFUSE, HALT }

struct Quote {
    Verdict verdict;
    string  reason;
    uint256 nav;
    uint64  navUpdatedAt;
    uint16  baseBps; uint16 utilBps; uint16 timeBps; uint16 creditBps;
    uint256 payout;
    uint256 capacityLeft;
}

function quote(uint256 claimId, uint256 amount) external view returns (Quote memory);
function sell(uint256 claimId, uint256 amount, uint256 minPayout) external;
function buy(uint256 claimId, uint256 amount, uint256 maxCost) external;

event ClaimMinted(uint256 claimId, address fund, uint64 settleAt, address owner, uint256 amount);
event ClaimSold(uint256 claimId, address seller, uint256 amount, uint256 usdcPaid, uint16 spreadBps);
event ClaimBought(uint256 claimId, address buyer, uint256 amount, uint256 usdcCost);
event ClaimSettled(uint256 claimId, uint256 usdcCollected);
event FundImpaired(address fund);
event NavUpdated(address fund, uint256 nav, uint64 updatedAt);
```

### Safety rules

- Exposure cap per fund: exceeding it returns REFUSE and `sell` reverts.
- Issuer FAILED or NAV older than `maxAge` (default 26 hours, feeds update daily): HALT.
- Only listed fund tokens are accepted.
- Only the authorised CRE forwarder can update NavOracle.
- `sell` takes the claim before paying.
- Vault is seeded on deploy and uses OpenZeppelin's virtual-shares offset.
- LP withdrawals are limited to USDC not tied up in claims.

## Network facts

| Item | Value |
|---|---|
| Arc testnet chain ID | 5042002 |
| Arc testnet RPC | https://rpc.testnet.arc.io |
| USDC (ERC-20, 6 decimals) | 0x3600000000000000000000000000000000000000 |
| Native gas balance | USDC, 18 decimals; never use for accounting |
| Test USDC faucet | https://faucet.circle.com |
| CRE forwarder on Arc, simulation | 0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1 |
| CRE forwarder on Arc, deployed | 0x76c9cf548b4179F8901cda1f8623568b58215E62 |
| USTB NAV feed, Ethereum mainnet | 0x289B5036cd942e619E1Ee48670F98d214E745AAC (6 decimals, daily) |

## Sponsor requirements

**Arc:** built in Arc Studio with a shareable project URL; Studio shown in the demo; working frontend and backend; architecture diagram; bounty named in the submission.

**Chainlink CRE:** a workflow connecting a blockchain to an outside API, simulated with the CRE CLI or deployed, and meaningfully used.

**Arkiv:** writes to Arkiv testnet with `@arkiv-network/sdk`; a user-facing feature reads from Arkiv; README lists the writing wallet and one runnable query; `/arkiv/schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`, `how-you-use-arkiv.md`.

## Arkiv entities

| Entity | Fields | Expires |
|---|---|---|
| `fund` | symbol, asset class, NAV, updated time, spread terms, cap, status | Shortly after each refresh |
| `claim` | claim id, fund, settlement date, amount, price, holder, status | On its settlement date |
| `bid` | fund, settlement date, price, size, bidder, signature | When the bid's validity ends |

Identity and eligibility data stay off Arkiv.

## Demo

1. A named fund and its real redemption schedule.
2. Sell a claim: USDC arrives, verdict BUY, four spread terms, proof link.
3. Ask for too much of one fund: REFUSE.
4. A buyer takes a discounted claim from the Arkiv book.
5. The issuer flips to failed: CRE reports it, HALT, LP share price drops in one transaction.
6. Arkiv query: live claims listed, settled ones expired.
7. Arc Studio and the architecture diagram.
