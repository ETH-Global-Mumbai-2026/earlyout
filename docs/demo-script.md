# Demo video script

ETHGlobal rules: 2 to 4 minutes, at least 720p, recorded on a computer (not a phone), your own voice (no text-to-speech or AI voiceover), no sped-up footage, no music-with-captions instead of talking. Aim for 3:30.

Before recording:
- Open https://earlyout.vercel.app, the Arc Studio project, the Arc explorer and a terminal in `earlyout/`.
- On `/status`, paste the demo key (`DEMO_TOKEN` in `web/.env.local`) into the Demo key field.
- Make sure the issuer is OK and the vault shows idle USDC above 2 USDC.
- Make sure the IssuerStub holds at least 2 USDC (a 0.001 ACREDd sale needs about 1.11 USDC at settlement). It was topped up to 5.886 USDC on 7 November; every rehearsal sale uses some.
- Rehearse the failure sequence once, then clear it with `pnpm impair clear` before the real run.
- Connect a wallet that holds demo fund tokens (the ops wallet, or use Try as judge on `/sell`).

| Time | Show | Say |
|---|---|---|
| 0:00 | Landing page hero | "Apollo's tokenized credit fund lets investors out once a quarter. If you need cash before then, there is no market. Earlyout buys your pending redemption today, in USDC on Arc." |
| 0:20 | Hero quote card | "This is a live quote from our vault on Arc: verdict first, the payout, and a spread split into four reasons. The curve shows why: waiting is the main cost." |
| 0:40 | `/sell`, ACREDd, 0.001, quote card | "Pick a fund and an amount. Before anything moves, the contract says BUY, REFUSE or HALT." Sell. "One transaction: the fund tokens go to the issuer's queue, the claim to the vault, USDC to me." Show the explorer link. |
| 1:20 | Type 1 unit | "Ask for too much and the contract refuses: this fund would pass its exposure cap. The app says how much the vault can still take." |
| 1:35 | `/book` | "Every open claim is written to Arkiv, a public database. This screen reads only from Arkiv. The demo claim expires at its payout date, and nothing of ours deletes it." Show the Arkiv entity link. |
| 2:00 | Terminal: `cre workflow simulate ./nav-bridge --target staging-settings --broadcast` (or the logs in `cre/README.md`) | "A Chainlink Runtime Environment workflow reads each fund's Chainlink NAV feed on Ethereum mainnet, ten listings including Apollo's ACRED and Janus Henderson's JAAA, plus the issuer's status API, and writes signed reports to our oracle on Arc." |
| 2:25 | `/status`: Simulate issuer failure, then `/sell` | "If the issuer fails, the oracle carries that status and every quote halts." (Live, the flip reaches the oracle through the app's NAV push; to show CRE carrying it, point the oracle at the simulation forwarder first and run `cre workflow simulate ./nav-bridge --target staging-settings --broadcast` after the flip, then point it back.) Note the Vault share price, run `pnpm impair mark <ACRED> <ACREDd>` (or Mark impaired for ACREDd), and show the share price fall: "the writedown reaches every LP in one transaction per fund." Restore the issuer, then `pnpm impair clear <ACRED> <ACREDd>` so quotes return to BUY. |
| 3:00 | Arc Studio project: the test run, the security review, the deploy transactions, the Studio-built app | "We brought the contracts into Arc Studio. Studio ran our 50 tests and a security review, fixed five Medium findings, added 13 tests, deployed everything from a Circle developer-controlled wallet, and built an app against them. One High finding is documented, with its fix." |
| 3:20 | README | "Real: the NAV, USDC, the contracts, the CRE reports and the Arkiv book. Stand-ins: the fund token and the issuer, because real ones are permissioned. Earlyout: we sell the wait." |

Submission form: select Arc (Best Smart Contracts with Advanced Stablecoin Logic in Arc Studio, and Best DeFi / Onchain Finance App; both count as one of your three partner picks), Arkiv (Build on Arkiv, from scratch) and Chainlink (Best workflow with CRE). Do not select Chainlink CCIP or the Arkiv + Swarm bonus: we use neither. For each, paste the integration notes and feedback from the README, and put the video link at the top of the README.
