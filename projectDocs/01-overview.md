# 01. Overview

## The problem

Tokenized private credit and money-market funds let investors out on a schedule, not on demand. Apollo's tokenized credit fund on Securitize (ACRED) repurchases at least 5% of the fund each quarter and pays once the underlying fund pays. The token itself only moves between issuer-approved wallets, so there is no exchange to sell it on. An investor who needs cash before the next window has no way out.

Earlyout sells that wait. A holder files the redemption as usual, but instead of waiting for the payout they sell the pending redemption to a USDC vault and are paid today. The vault waits for the payout instead, and its liquidity providers earn the difference.

## Who uses it

| User | What they do | Where |
|---|---|---|
| Fund holder | Sells a pending redemption for USDC in one transaction | `/sell` |
| Liquidity provider (LP) | Deposits USDC into the vault (ERC-4626 shares, symbol `eoUSDC`), earns the spread when claims settle | `/vault` |
| Platform, distributor or issuer | Brings eligibility: real fund tokens only move between KYC-approved wallets and the platform controls that list. Earlyout brings the liquidity, the price and a public book | `/platforms` (site), the HTTP API, the Arkiv book |
| Anyone | Reads the public book of open claims on Arkiv, verifies prices against Chainlink and Arc | `/book`, `pnpm arkiv:query` |

The original spec named distributors and issuers as the customer; the redesign spec (see [11-roadmap.md](11-roadmap.md)) treats all three audiences as first-class.

## How a sale works, end to end

1. The holder picks a fund and an amount on `/sell`. The app asks the vault for a quote (`Vault.quoteFund`) before anything moves. The quote shows the verdict first, then the payout and the four spread terms.
2. If the verdict is BUY, the holder signs one transaction: `ClaimWrapper.depositAndSell(fund, amount, minPayout)`. The app sets `minPayout` to 99.5% of the quoted payout. (A one-time ERC-20 approval of the fund token to the wrapper may come first.)
3. Inside that transaction:
   - the wrapper pulls the fund tokens and files the redemption with the issuer (`IssuerStub.requestRedemption`), which returns the payout date;
   - the wrapper mints an ERC-1155 claim whose id is `keccak256(abi.encode(fund, settleAt))`;
   - the vault re-checks the quote, takes the claim and sends USDC to the seller.
4. The app posts the transaction hash to `/api/arkiv/sync`, which writes the sale to Arkiv within seconds. The record expires on its own at the payout date.
5. The vault carries the claim at its USDC cost. On or after the payout date anyone can call `Vault.settle(claimId)`: the wrapper collects USDC from the issuer at the current NAV and the vault redeems its claims. The spread becomes LP profit and the share price rises.
6. If the issuer fails before payout, the oracle reports it, every quote for that fund turns HALT, and anyone can call `markImpaired(fund)` to write the fund's claims down to their recovery value, which moves every LP's share price in one transaction.

## Verdicts

Every quote returns exactly one verdict and, unless it is BUY, a reason string. The checks run in a fixed order; the first match wins (full list in [03-contracts.md](03-contracts.md#verdict-order)).

| Verdict | Meaning | Reasons |
|---|---|---|
| BUY | The vault buys at the shown price | (none) |
| REFUSE | The vault will not buy this sale, but the fund is healthy | Fund not listed, amount is zero, claim is already due, spread too wide, over the fund cap, vault short of USDC |
| HALT | Trading in this fund is stopped | Issuer reports failure, NAV is stale, fund is impaired |

## Funds

Ten funds are listed in FundRegistry, which is its maximum. Each fund on Arc is a stand-in token priced from the real fund's Chainlink NAV feed on Ethereum mainnet.

| Symbol | Fund | Payout delay on Arc | Offered for sale in the app |
|---|---|---|---|
| ACRED | Apollo Diversified Credit Securitize Fund | 90 days | Yes |
| ACREDd | ACRED with a 15-minute demo window (same NAV feed) | 15 minutes | Yes |
| JAAA | Janus Henderson Anemoy AAA CLO Fund | 7 days | Yes |
| USCC | Superstate Crypto Carry Fund | 3 days | Yes |
| JTRSY, USTB, USTBL, SAFO, CASH+, Treasury+ | Treasury and money-market funds | 1 day | No, shown for comparison |

The app only offers the four funds with a real wait (`isScheduled` in `web/src/lib/glossary.ts`). The contract would still quote the other six if called directly; their payout terms on Arc are illustrative.

## Status

- **Testnet only.** Arc testnet, chain 5042002. Test USDC. Nothing is on mainnet.
- Live at https://earlyout.vercel.app, deployed from the `main` branch.
- Contracts were reviewed, tested (63 tests) and deployed through Arc Studio on 6 November 2026. One High finding (LP gain sniping) is open and accepted for the testnet demo. See [10-security.md](10-security.md).
- The CRE workflow has been simulated with `--broadcast` against Arc testnet; it is not deployed to the CRE network. Between simulations the ops wallet is the oracle's forwarder and the server pushes the same report format.
- A redesign of the whole web app is in progress on branch `redesign`, and a Buy feature is parked in `stash@{0}`. See [11-roadmap.md](11-roadmap.md).

## What is real and what is a stand-in

| Real | Stand-in, and why |
|---|---|
| Fund NAVs: Chainlink NAV feeds on Ethereum mainnet, one per fund | Fund tokens (`FundToken`): real ones only transfer between issuer-approved wallets |
| USDC on Arc (`0x3600000000000000000000000000000000000000`, 6 decimals), also Arc's gas token | The issuer (`IssuerStub`): queues redemptions and pays NAV after the delay; the owner pre-funds it with USDC |
| All Earlyout contracts, the vault's accounting and verdicts | The issuer status API (`/api/issuer-status`): reflects `IssuerStub.failed()`; in production this would be the issuer's attestation. One status covers every fund |
| The CRE workflow and its report path (simulated) | The live NAV writer between simulations: the ops wallet via `/api/nav/push` |
| The Arkiv book (Rabdi testnet) | |

## Known limits

- Settlement needs someone to call `Vault.settle` after each payout date. There is no keeper process in this repository.
- LP gain sniping (High, fixed 20 November 2026): claim value now accrues to the payout date. See [10-security.md](10-security.md).
- The Arkiv block scan (buys, settlements, NAV history) runs once a day, or on demand. Sales are indexed from their receipt within seconds.
- Ten listings fill FundRegistry's limit of ten.
