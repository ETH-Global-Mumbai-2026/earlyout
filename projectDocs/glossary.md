# Glossary

| Term | Meaning |
|---|---|
| ACRED | Apollo Diversified Credit Securitize Fund. On Arc, a stand-in token with a 90-day payout and a 1-day window, priced from the real Chainlink feed |
| ACREDd | A second ACRED stand-in with a 15-minute payout and 5-minute window, for live demos; same NAV feed |
| Arc | Circle's stablecoin chain. Earlyout runs on Arc testnet, chain 5042002, where USDC is also the gas token |
| Arc Studio | Circle's agent workspace for Arc; it reviewed, tested and deployed the contracts |
| Arkiv | A public, queryable data layer with expiring entities. Earlyout uses the Rabdi testnet (chain 7794095) for its book |
| base (`baseBps`) | The fixed spread term, global in FundRegistry (50 bps today) |
| Book | The public list of open claims on Arkiv, shown at `/book` |
| bps | Basis points, hundredths of a percent: 100 bps is 1% |
| BUY | Verdict: the vault buys at the shown price |
| buy price (`buyPrice`) | What a buyer pays the vault for a claim it holds: NAV minus the time and credit terms only |
| capacity left | The fund's exposure cap minus what the vault has already deployed in it, in USDC |
| claim | An ERC-1155 token for a pending redemption, one id per (fund, payout date) |
| claim id | `uint256(keccak256(abi.encode(fund, settleAt)))` |
| ClaimToken | The ERC-1155 contract holding all claims; allowlisted transfers |
| ClaimWrapper | Turns fund tokens into a claim and pays claim holders after the issuer settles |
| collect | `ClaimWrapper.collect`: pull USDC from the issuer for a claim id after its payout date |
| CRE | Chainlink Runtime Environment: runs a workflow across Chainlink nodes and signs what they agree on |
| credit (`creditBps`) | The issuer credit spread term, per fund |
| decimals offset | ERC-4626 virtual shares; the vault uses 6, so shares have 12 decimals |
| deployed USDC | USDC the vault has paid for claims it still holds, at cost (`deployedUsdc`, `fundCost`) |
| ERC-1155 | Token standard for one contract holding many token types |
| ERC-4626 | Tokenized vault standard: deposit assets, receive shares |
| exposure cap | Max USDC the vault may have deployed in one fund (`exposureCapUsdc`, 20 USDC for every fund today) |
| forwarder | The only address NavOracle accepts reports from: the CRE forwarder, or the ops wallet between simulations |
| FundRegistry | Listed funds (max 10) and their pricing terms |
| FundToken | Stand-in fund share with allowlisted transfers |
| HALT | Verdict: trading in the fund is stopped (issuer failure, stale NAV, or impairment) |
| idle USDC | USDC in the vault not tied up in claims; caps payouts and LP withdrawals |
| impaired | A fund whose claims have been written down to `recoveryBps` of cost after the issuer failed (`markImpaired`) |
| IssuerStub | Stand-in for the fund issuer's redemption desk |
| keeper | Whoever calls `Vault.settle` after a payout date; no automated keeper exists yet |
| LP | Liquidity provider: deposits USDC in the vault and earns the spread |
| LP lock | The vault pausing LP deposits (and, before a writedown, withdrawals) while impairment flags disagree with the oracle |
| `maxAge` | How old a NAV may be before quotes HALT (96 hours for every fund) |
| `minPayout` | The seller's slippage guard on `sell`; the app sets it to 99.5% of the quote |
| mock mode | `NEXT_PUBLIC_MODE=mock`: the web app runs on in-memory data with no chain |
| NAV | Net asset value: what one fund unit is worth, published by the fund through a Chainlink feed |
| NAVLink | Chainlink's NAV feed product for tokenized funds; eight of the ten funds use one |
| nav-bridge | The CRE workflow that carries NAV and issuer status to NavOracle |
| NavOracle | Arc contract storing NAV, timestamp and issuer status per fund |
| ops wallet | `0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B`: owner of every contract and the current oracle forwarder |
| payout | USDC the seller receives: value × (1 − spread) |
| payout date (`settleAt`) | When the issuer pays: request time plus the fund's delay, rounded up to its window |
| recovery (`recoveryBps`) | Value of an impaired fund's claims, in bps of cost |
| REFUSE | Verdict: the vault will not buy this sale (cap, idle USDC, already due, zero amount, spread too wide, unlisted) |
| report | `abi.encode(fund, nav, navDecimals, updatedAt, status)`, the one format both NAV writers use |
| settle | `Vault.settle`: after the payout date, collect from the issuer and redeem the vault's claims |
| share price | USDC per whole vault share (`sharePrice()`) |
| spread | base + vault usage + time + credit, in bps |
| stand-in | A testnet replacement for something permissioned in production: fund tokens, the issuer, the issuer status API |
| time (`timeBps`) | The time-to-payout spread term: `volBps × √(years to payout)` |
| USDC | Circle's dollar stablecoin; `0x3600000000000000000000000000000000000000` on Arc, 6 decimals |
| vault usage (`utilBps`) | The spread term that grows as more of the vault is deployed: `utilSlopeBps × deployed / totalAssets` |
| verdict | BUY, REFUSE or HALT, returned first by every quote |
| window | The step payout dates are rounded up to (for example 1 day) |
| workflow pinning | NavOracle's optional check that a report came from one CRE workflow owner and id |
| writer wallet | `0x343F684dAFFf216CDf38a40888662148eBa07Fd7`, the only wallet whose Arkiv entities the app reads |
