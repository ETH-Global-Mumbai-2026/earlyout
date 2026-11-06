# Why Arkiv

Earlyout's customers are fund distributors. When a client sells a pending redemption, the distributor needs to see it: the claim, its payout date, the price, the four reasons behind the price, and the Arc transaction. They need the same view for every claim still open, across all their clients, and they need it from a source that is not our web server.

A table in our database would answer the question only while we run it. An event log on Arc answers it only to someone willing to replay every log. Arkiv gives the thing in between: a public, typed, queryable registry that anyone can read with one query, that we write with one wallet, and that cleans itself up.

Three properties mattered:

1. **Queryable by anyone.** A distributor, an LP, or a judge runs `select().from(Claims).where(eq("status","open"))` against the Rabdi RPC and gets the live book. No API key from us, no server of ours in the path.
2. **Expiry is part of the data model.** Every claim has a payout date. We set the entity to expire at that date, so the book only ever contains claims that are still pending. Nothing of ours deletes rows, and a dead indexer cannot leave a stale directory behind, because the directory expires one day after its last refresh.
3. **Writes are attributable.** Each entity carries the writer's address. The README names that wallet, so a reader can check that the book was written by Earlyout and not by anyone else.

What Arkiv is not used for: anything a contract needs to read. Pricing, caps and halts live on Arc, where they are enforced. Arkiv is the window onto that state for the people who have to act on it.
