# Arkiv friction log

One entry each time Arkiv's SDK, docs or testnet gets in the way: what we expected, what happened, and how to reproduce it.

| When | Expected | What happened | How to reproduce |
|---|---|---|---|
| 2026-11-06 19:30 IST | Read the SDK version from npmjs.com | The npm page for `@arkiv-network/sdk` returned HTTP 403 to a plain fetch; the docs site worked. Version (1.0.1) only became known after `pnpm add` | `curl -I https://www.npmjs.com/package/@arkiv-network/sdk` from a script |
| 2026-11-06 20:25 IST | Pass a viem `Address` and a `bigint` straight into `createEntity` for `addr()` and `u64()` columns, since `u256()`, `i32()` and `str()` accept bare values | TypeScript rejects them: `` Type '`0x${string}`' is not assignable to type 'AddrValue' `` and `Type 'bigint' is not assignable to type 'U64Value'`. Wrapping with `addr(x)` and `u64(x)` fixes it. The asymmetry (bare bigint is fine for u256 but not u64) cost a round of edits | Any `createEntity` with an unwrapped address or u64 bigint; see `web/src/server/arkiv/sync.ts` |
| 2026-11-06 20:30 IST | `eq("fund", someAddress)` in a `where` on an `addr().indexed()` column | Compile error "fund has type addr, but is compared against a value of type str". Same fix, `eq("fund", addr(x))` | `web/src/server/arkiv/sync.ts` fund lookup |
| 2026-11-06 20:32 IST | Run the sample query with Node 24 and `--experimental-strip-types` | Works, but the public endpoint prints a rate-limit warning on every run until an access key is set. No way to tell from the response whether a request was throttled | `cd web && pnpm arkiv:query` without `ARKIV_ACCESS_KEY` |
