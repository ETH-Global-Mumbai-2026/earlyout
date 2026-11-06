# Demo video script

ETHGlobal rules: 2 to 4 minutes, at least 720p, recorded on a computer (not a phone), your own voice (no text-to-speech or AI voiceover), no sped-up footage, no music-with-captions instead of talking. Aim for 3:30.

Before recording:
- Open https://earlyout.vercel.app, the Arc Studio project, the Arc explorer and a terminal in `earlyout/`.
- On `/status`, paste the demo key (`DEMO_TOKEN` in `.env`) into the Demo key field.
- Make sure the issuer is OK and the vault shows idle USDC above 2 USDC.
- Connect a wallet that holds demo fund tokens (the ops wallet, or use Try as judge on `/sell`).

| Time | Show | Say |
|---|---|---|
| 0:00 | Landing page hero | "Apollo's tokenized credit fund lets investors out once a quarter. If you need cash before then, there is no market. Earlyout buys your pending redemption today, in USDC on Arc." |
| 0:20 | Hero quote card | "This is a live quote from our vault on Arc: verdict first, the payout, and a spread split into four reasons. The curve shows why: waiting is the main cost." |
| 0:40 | `/sell`, ACREDd, 0.001, quote card | "Pick a fund and an amount. Before anything moves, the contract says BUY, REFUSE or HALT." Sell. "One transaction: the fund tokens go to the issuer's queue, the claim to the vault, USDC to me." Show the explorer link. |
| 1:20 | Type 1 unit | "Ask for too much and the contract refuses: this fund would pass its exposure cap." |
| 1:35 | `/book` | "Every open claim is written to Arkiv, a public database. This screen reads only from Arkiv. The demo claim expires at its payout date, and nothing of ours deletes it." Show the Arkiv entity link. |
| 2:00 | Terminal: `cre workflow simulate ./nav-bridge --target staging-settings --broadcast` (or the logs in `cre/README.md`) | "A Chainlink CRE workflow reads the ACRED NAV feed on Ethereum mainnet and the issuer's status API, and writes both to our oracle on Arc." |
| 2:25 | `/status`: Simulate issuer failure, then `/sell` | "If the issuer fails, CRE carries that to the oracle and every quote halts." Then Mark impaired: "Anyone can write the fund down, and every LP's share price falls in one transaction." Restore. |
| 3:00 | Arc Studio project | "The contracts were written, tested, security-reviewed and deployed in Arc Studio, from a Circle developer-controlled wallet. 63 tests, five Medium findings fixed, one High documented." |
| 3:20 | README | "Real: the NAV, USDC, the contracts, the CRE reports and the Arkiv book. Stand-ins: the fund token and the issuer, because real ones are permissioned. Earlyout: we sell the wait." |

Submission form: select Arc (Best Smart Contracts with Advanced Stablecoin Logic in Arc Studio), Arkiv (Build on Arkiv, from scratch) and Chainlink (Best workflow with CRE). For each, paste the integration notes and feedback from the README.
