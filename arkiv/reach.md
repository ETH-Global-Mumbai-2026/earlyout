# Reach

## Who it is for, and would they use it

Fund distributors and the issuers of tokenized private credit funds. Apollo's ACRED alone is a $34M fund with a quarterly repurchase window of at least 5% and no secondary market; its distributor (Securitize) has clients who want out between windows. The Book is the view those distributors need: every open claim across their clients, its payout date, its price and the Arc transaction behind it, from a source that is not our server.

## Can they try it today

Yes, at the live app's Book screen (URL in the README), with no wallet. Or by running the query in the README against the public Rabdi RPC.

## After Mumbai

We keep building it. Next: a bids schema (standing offers that expire at their deadline), a proof page per claim keyed by the Arkiv entity key, and the NAV history schema exposed as a mirror of Chainlink NAV feeds for any app that wants it.

## Who sees the Arkiv book and how

- **The Book screen** in the app, at `/book`. Public, no wallet needed.
- **Distributor dashboards.** The schema is documented so a distributor can query the book from their own tooling with `@arkiv-network/sdk`, filtered by fund or payout date.
- **Judges and reviewers.** The README includes a runnable query and the writer wallet, so the book can be checked without trusting the app.
- **Buyers.** A claim entity carries everything needed to decide whether to buy it from the vault: NAV, the four spread terms, payout date, and the Arc transaction that created it.

Ways we plan to extend reach after the hackathon: a bids schema so buyers can post standing offers that expire on their own, and a per-claim proof page keyed by the Arkiv entity key.
