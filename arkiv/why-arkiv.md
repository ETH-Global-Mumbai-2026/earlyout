# Why Arkiv

Earlyout's customers are fund distributors. When a client sells a pending redemption, the distributor needs to see it: the claim, its payout date, the price, the four reasons behind the price, and the Arc transaction. They need the same view for every claim still open, across all their clients, and they need it from a source that is not our web server.

A table in our database would answer the question only while we run it. An event log on Arc answers it only to someone willing to replay every log. Arkiv gives the thing in between: a public, typed, queryable registry that anyone can read with one query, that we write with one wallet, and that cleans itself up.

Three properties mattered:

1. **Queryable by anyone.** A distributor, an LP, or a judge runs `select().from(Claims).where(eq("status","open"))` against the Rabdi RPC and gets the live book. No API key from us, no server of ours in the path.
2. **Expiry is part of the data model.** Every claim has a payout date. We set the entity to expire at that date, so the book only ever contains claims that are still pending. Nothing of ours deletes rows, and a dead indexer cannot leave a stale directory behind, because the directory expires one day after its last refresh.
3. **Writes are attributable.** Each entity carries the writer's address. The README names that wallet, so a reader can check that the book was written by Earlyout and not by anyone else.

What Arkiv is not used for: anything a contract needs to read. Pricing, caps and halts live on Arc, where they are enforced. Arkiv is the window onto that state for the people who have to act on it.

## If we swapped Arkiv for Postgres, what would users lose?

- **Reading without us.** Today a distributor runs one query against Arkiv's public RPC and gets the live book (see the README). With Postgres they would need an API from us, an account, and our server to be up.
- **Proof of who wrote it.** Every entity carries its owner. The Book filters on Earlyout's writer wallet, `0x343F684dAFFf216CDf38a40888662148eBa07Fd7`, so a reader can check that an entry came from us. A row in our database proves nothing to an outsider.
- **Cleanup they can trust.** A claim expires at its payout date on Arkiv itself. In Postgres, "settled claims disappear" is a promise about our cron job.
- **History they can audit.** Every create, patch and extension is a transaction on Rabdi, visible in the explorer.

## What we kept off Arkiv, and why

| Kept off | Where it lives | Why |
|---|---|---|
| Prices, caps, halts, the writedown | Arc contracts | They must be enforced, not just recorded. Arkiv is the window onto that state, never the source of it |
| USDC balances and claim ownership | Arc | Money and tokens settle on Arc |
| Wallet allowlists, KYC status | the distributor's own systems, mirrored as an on-chain allowlist | Identity data must not be public, and Arkiv entities are public |
| Private keys, API keys, the demo key | server environment only | Secrets never go into a public database |
