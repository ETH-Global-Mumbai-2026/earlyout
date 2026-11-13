# 11. Roadmap

Three things are in flight or waiting: the web redesign (in progress on branch `redesign`), the Buy feature (parked in a git stash), and the work needed before mainnet.

## Web redesign

Spec: `docs/superpowers/specs/2026-11-12-redesign-design.md`. Plan: `docs/superpowers/plans/2026-11-12-redesign.md` (21 tasks in six stages, plus task 6b and Amendment A). Scope is the whole `web/` app; contracts and the CRE workflow are out of scope, and the data layer stays.

### Why

After the ETHGlobal win the team is turning Earlyout into a company. The hackathon UI copied the iOS Settings app, used a template landing page, spoke to judges ("Try as judge", "For judges"), and gave dashboards more visual weight than their numbers. The redesign aims to make Earlyout read as a credible financial product for holders, LPs and platforms, built around its core idea: a price that explains itself, verdict first.

### Direction A, "the quote is the hero", in Ledger green

- Warm paper and ink, like a fund document rather than a crypto app. Light canvas `#f6f3ec`, dark canvas `#12110e`, brand green `#2f5d3a` (light) / `#86b892` (dark), separate BUY, REFUSE and HALT colours, and four fixed chart colours for base, vault usage, time and credit (credit is never red).
- Primary buttons are ink, never green, so green never reads as a BUY.
- Type: Instrument Serif for display and large money figures, Geist for UI text, Geist Mono for labels, tables and addresses. Averta is removed.
- Small radii, hairlines, term-sheet details (dashed rules, mono headers, a rubber-stamp verdict).
- Redrawn clock-face logo with a green arrow; real issuer logos for fund marks (`FundMark`, sources recorded in `web/public/funds/SOURCES.md`, monogram fallback).
- Rich but skippable motion: the hero quote sheet builds line by line and the verdict stamp presses on; everything honours `prefers-reduced-motion` and nothing delays the price or the sell button.
- A non-dismissible testnet strip on every page, controlled by `NEXT_PUBLIC_TESTNET`.
- No em or en dashes in any user-facing text.

### Three-door home page

The hero shows a live per-unit ACRED quote sheet (quoting 0.001 units and scaling, with the real verdict, never a hard-coded BUY) and three doors: "I hold a fund" (Get a quote, `/sell`), "I provide USDC" (Open the vault, `/vault`), "I run a platform" (Read the API, `/platforms`). Each door rewrites the sheet: a quote, a vault sheet, or the quote as an API JSON response. Below: the problem, how a sale works, pricing, the funds table (three buyable funds first, the rest under "Also priced"), the verdict controls, where the price comes from, three audience panels and a closing call to action.

### Site routes

`/holders`, `/liquidity` (new), `/platforms`, `/docs`, `/security`, `/company`, `/legal`, with permanent redirects from `/how-it-works`, `/distributors`, `/developers` and `/about`.

### Sidebar app

A left sidebar grouped by audience replaces the tab bar:

| Group | Screens |
|---|---|
| Holders | Sell a redemption (`/sell`), My sales (`/sales`, new) |
| Liquidity | Vault (`/vault`), Positions (`/positions`, new) |
| Market | Open claims (`/book`), Buy a claim (`/buy`, revived), Oracle and risk (`/status`) |
| Platforms | API and keys (`/api-access`, new) |

A top bar carries a contextual market strip and the wallet button; on phones the sidebar becomes a sheet.

New screens:

- **My sales**: the connected wallet's sales history, from a new read-only server read of `ClaimSold` logs filtered by the indexed `receiver`, joined with Arkiv where a record still exists.
- **Positions**: the LP view of the vault's claims (cost, expected value, spread earned, payout date) and totals.
- **Buy a claim**: see below.
- **API and keys**: endpoint overview, example request and response, and a "Request access" mailto to a placeholder address (`PLATFORM_CONTACT_EMAIL`). No sign-in or key storage.

Other changes: "Try as judge" becomes "Get test tokens" (same `/api/demo/judge` route), shown only on testnet when the wallet is not set up, with a link to Circle's faucet; the demo controls on `/status` are hidden unless the demo key has been entered; new figures (days skipped, annualised cost of exit hidden under 7 days, expected return) from `web/src/lib/metrics.ts`.

### Status

Work happens on branch `redesign`, uncommitted, with commits only after owner approval. The task ledger (`.superpowers/sdd/2026-11-12-redesign/progress.md`) records tasks 1 to 7 and 6b complete at the time of writing: unit-test harness and dead-code removal, tokens and fonts, primitives, brand and fund marks, testnet strip and theme toggle, the copy deck (`web/src/lib/copy.ts`), metrics helpers, and site chrome with the renamed routes and redirects. The hero (task 8) has tests in `web/e2e/home.spec.ts`. Still to come: home sections, the remaining site pages (`/liquidity` is a header only), the sidebar shell, the app screens, Buy, and the final responsive and copy validation.

`PUBLIC_ROUTES` (and so the sitemap) already lists `/sales`, `/positions`, `/buy` and `/api-access`, which have no pages yet.

## Buy (parked)

`stash@{0}` on branch `feat/buy`, "buy: Vault.buy sheet, holdings and redeem, arkiv buy sync (parked, not for main)", based on commit `a30b836`. It adds:

- `ClaimPosition` and `Holding` types; `claimPosition`, `buy`, `holdings` and `redeem` on the `Source` interface, in both chain and mock sources;
- `GET /api/claim?id=&amount=` (what the vault holds in a claim and the buyer's price) and `GET /api/holdings?address=` (claims a wallet holds, from claim ids the Arkiv book knows, checked on chain);
- `BuySheet.tsx` on the Book screen;
- `syncTx` in the Arkiv indexer: indexes `ClaimBought` from the receipt, and marks a claim `bought` only once the vault no longer holds any of it (`Vault.positions`).

The contracts already support it: `Vault.buy(claimId, amount, maxCost)` at `buyPrice` (NAV minus time and credit), and `ClaimWrapper.redeem` after payout.

The redesign revives it as **whole claims only**: a buy takes an entire claim, so the Arkiv record flips from open to bought cleanly and Open claims, Positions and the hero never overstate what the vault holds. The UI moves to `/buy` with a "Your claims" list and a redeem action after payout. The stash branched before four newer commits on `main` (including "offer jaaa and uscc for sale"), so it needs conflict resolution. An accidental 0.001 ACRED buy happened during development and some open Arkiv claims needed manual handling; development stays in mock mode, and every real testnet buy or redeem needs the owner's explicit yes.

## Other planned or open work

| Item | Source |
|---|---|
| Linear accrual of claim value in `totalAssets()` (fixes the open High) | Security review |
| Deploy the CRE workflow to the CRE network with workflow pinning | `cre/README.md`, README |
| A keeper that settles claims at maturity | README "Honest limits" |
| A fifth Arkiv schema for bids | Original spec (never built) |
| Platform API keys, sign-in and rate limits | Redesign non-goal for now |
| Issuer logo permissions, a real platform contact address | Redesign open items |

## Mainnet requirements

The full checklist is in [10-security.md](10-security.md#before-mainnet). In short: fix LP gain sniping, get an independent audit, replace the stand-in issuer, fund tokens and status API with real ones, move the oracle to a pinned CRE workflow, put ownership behind a multisig and timelock, automate settlement and alerting, and remove the testnet demo routes. The contracts and deploy script are chain-agnostic; a mainnet deployment is the same script against a different RPC once those are done.
