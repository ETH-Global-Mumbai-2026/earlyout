# Earlyout

Early exit for funds that redeem on a schedule.

Tokenized private credit funds let investors out once a quarter or once a month. Apollo's tokenized credit fund on Securitize, for example, repurchases at least 5% of the fund each quarter and pays once the underlying fund pays. An investor who needs cash before the next window has no way out.

Earlyout lets that investor sell their pending redemption today. The redemption becomes a claim token, the investor sells it to a USDC vault on Arc, and the vault collects from the fund when it pays. The price is the fund's real NAV minus a spread that names its four reasons.

## How it works

1. A holder deposits a fund token. Earlyout requests redemption from the issuer and mints a claim token for that fund and payout date.
2. The holder sells the claim to the vault and receives USDC in the same transaction.
3. The vault holds the claim, or sells it to a buyer at a discount, and collects the full amount at settlement.
4. LPs fund the vault and earn the spread.

Every quote returns a verdict first:

| Verdict | When |
|---|---|
| BUY | The vault buys at the shown price |
| REFUSE | The fund would exceed its exposure cap in the vault |
| HALT | The issuer reports failure, or the NAV is stale |

The spread has four terms, all shown on screen: base, vault utilisation, time to settlement, and issuer credit.

## Partners

| Partner | Role |
|---|---|
| Arc (Circle) | All contracts run on Arc testnet. Payouts settle in USDC, which also pays gas. |
| Chainlink CRE | A workflow reads real fund NAV from Chainlink feeds on Ethereum mainnet plus issuer status, and writes both to the oracle on Arc. |
| Arkiv | The public book of claims and bids. Entries expire on their settlement date. |

## What is real and what is a stand-in

| Real | Stand-in, and why |
|---|---|
| Fund NAV, read from Chainlink feeds on mainnet | Fund tokens: real ones only transfer between issuer-approved addresses |
| USDC on Arc | Issuer contract: same reason |
| All Earlyout contracts on Arc testnet | Issuer status feed: in production this is the issuer's attestation or Chainlink Proof of Reserve |
| The Arkiv order book | |

## Repository layout

| Path | Contents |
|---|---|
| `docs/spec.md` | Build spec: contracts, interfaces, sponsors, demo |
| `arkiv/` | Arkiv judging files |
| `contracts/` | Solidity, built in Arc Studio (coming) |
| `cre/` | Chainlink CRE workflow (coming) |
| `web/` | App and API (coming) |

## Status

Work in progress at ETHGlobal Mumbai 2026.

## How we used AI

To be completed before submission, as ETHGlobal's rules require.

## Licence

MIT
