import { ArrowUpRight, ChevronRight, Gauge, ListChecks, Zap } from "lucide-react";
import Link from "next/link";
import { CTA, Container, DataRows, Grid, Section, Tile } from "@/components/site/blocks";
import { HeroShowcase } from "@/components/site/HeroShowcase";
import { HeroTicker } from "@/components/site/HeroTicker";
import { CashWait } from "@/components/site/CashWait";
import { OracleDiagram, SaleFlowDiagram, VerdictDiagram } from "@/components/site/Diagrams";
import { REPO, STUDIO } from "@/components/site/links";
import { Reveal } from "@/components/motion/Reveal";
import { SpreadBar } from "@/components/viz/SpreadBar";
import { SpreadCurve } from "@/components/viz/SpreadCurve";
import { CATALOG, GLOSSARY, isScheduled } from "@/lib/glossary";

const X = "https://explorer.testnet.arc.io";
const proofs: { claim: string; how: string; href: string; cta: string }[] = [
  { claim: "Contracts tested, reviewed and deployed in Arc Studio", how: "The Studio project, its security review and the 34 deploy transactions.", href: STUDIO, cta: "Open the Studio project" },
  { claim: "Live on Arc testnet", how: "The Vault contract, owned by our ops wallet after Studio handed it over.", href: `${X}/address/0x7A40b36b012DC19b1f42dd68C13F4daE312e2319`, cta: "View the Vault on Arc" },
  { claim: "A real sale, settled in USDC", how: "One transaction: fund tokens in, claim to the vault, USDC to the seller.", href: `${X}/tx/0x12aefa9df1553daadc4c026566387f0fdde7cf9af6a0153a5eac5e141973a5ee`, cta: "View the sale" },
  { claim: "Chainlink Runtime Environment (CRE) drives the oracle", how: "Three broadcast runs: issuer OK, issuer FAILED and the halt, then restored.", href: `${REPO}/blob/main/cre/README.md`, cta: "Read the CRE logs" },
  { claim: "The book lives on Arkiv", how: "The Book screen reads only from Arkiv; anyone can run the same query.", href: "/book", cta: "Open the book" },
  { claim: "Tested and open source", how: "63 contract tests, 66 end-to-end checks on phone, tablet and desktop, MIT licence.", href: REPO, cta: "Read the code" },
];

export default function Landing() {
  return (
    <>
      <section className="-mt-[70px] overflow-hidden pt-[70px]">
        <Container className="pb-16 pt-10 text-center sm:pb-24 sm:pt-14">
          <Reveal y={12}>
            <a href="#verify" className="pressable mx-auto mb-8 inline-flex items-center gap-1 rounded-full bg-sunk/80 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium text-ink-2 hover:text-ink">
              See the proof behind every number <ChevronRight size={15} aria-hidden />
            </a>
            <HeroTicker />
            <h1 className="t-hero mx-auto mt-9 max-w-4xl !text-[clamp(2.5rem,5.6vw,4.25rem)]">
              Get paid today. <span className="text-muted">Not when the fund&apos;s window opens.</span>
            </h1>
            <p className="t-lede mx-auto mt-6 max-w-2xl text-[19px] sm:text-[21px]">
              Earlyout buys your pending redemption in a tokenized fund for USDC, now, at the fund&apos;s real net asset value (NAV) minus a spread that explains itself.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              <CTA href="/sell">Try a sale</CTA>
              <Link href="/how-it-works" className="inline-flex items-center gap-0.5 text-[17px] text-accent hover:underline">
                How it works <ChevronRight size={18} />
              </Link>
            </div>
          </Reveal>
          <div className="mt-12 sm:mt-14">
            <HeroShowcase />
          </div>
          <Reveal>
            <ul className="mx-auto mt-12 grid max-w-3xl gap-4 text-left text-[15px] sm:grid-cols-3">
              {[
                [ListChecks, "Price explained", "Four terms, shown before you sign"],
                [Zap, "Paid in one transaction", "USDC reaches you on Arc immediately"],
                [Gauge, "Guarded by the contract", "It refuses or halts when it should"],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Zap;
                return (
                  <li key={t as string} className="flex gap-3">
                    <I size={20} className="mt-0.5 shrink-0 text-accent" strokeWidth={1.75} />
                    <span>
                      <span className="block font-semibold">{t as string}</span>
                      <span className="block text-muted">{d as string}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mx-auto mt-6 max-w-xl text-[12px] text-faint">Arc testnet. Quotes are read live from the Vault contract; fund tokens and the issuer are stand-ins.</p>
          </Reveal>
        </Container>
      </section>

      <Section
        tint
        center
        eyebrow="The problem"
        title="The fund is liquid on paper. The investor is not."
        lede="Private credit funds limit how much can leave each quarter. When requests exceed the gate, investors wait. Tokenizing the fund did not change the schedule."
      >
        <Grid cols={3}>
          <Tile title="Quarterly windows">ACRED repurchases at least 5% of the fund each quarter and pays once the underlying fund pays.</Tile>
          <Tile title="No secondary market">The tokens only move between issuer-approved wallets, so a holder cannot sell them on an exchange.</Tile>
          <Tile title="Gates in 2026">Large private credit funds have gated redemptions this year. Holders who need cash have had nowhere to go.</Tile>
        </Grid>
        <div className="mt-8">
          <CashWait />
        </div>
      </Section>

      <Section center eyebrow="How a sale works" title="You sign once. USDC arrives in the same transaction.">
        <div className="card mx-auto max-w-5xl p-4 sm:p-8">
          <SaleFlowDiagram />
        </div>
      </Section>

      <Section
        tint
        center
        eyebrow="Funds"
        title="One Chainlink pipeline, ten NAV feeds."
        lede="Every fund below publishes its net asset value (NAV) through a Chainlink feed on Ethereum mainnet, and our Chainlink Runtime Environment (CRE) workflow carries each price to Arc. Earlyout buys from funds with a wait before payout: ACRED, JAAA and USCC. The money-market funds pay within a day, so they are priced for comparison, not bought."
      >
        <Reveal className="card mx-auto max-w-5xl overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="tbl min-w-[760px]">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Holds</th>
                  <th>Issuer</th>
                  <th>On Earlyout</th>
                  <th className="r">Chainlink NAV feed</th>
                </tr>
              </thead>
              <tbody>
                {CATALOG.map((f) => (
                  <tr key={f.symbol}>
                    <td className="!whitespace-normal">
                      <span className="block font-semibold">{f.symbol}</span>
                      <span className="mt-0.5 block text-[14px] text-ink-2">{f.name}</span>
                    </td>
                    <td className="!whitespace-normal">{f.holds}</td>
                    <td className="!whitespace-normal text-muted">{f.issuer}</td>
                    <td>
                      {isScheduled(f.symbol) ? (
                        <span className="badge bg-buy-soft font-semibold text-buy">Buys your redemption</span>
                      ) : (
                        <span className="badge bg-sunk text-ink-2">Price only</span>
                      )}
                    </td>
                    <td className="r">
                      <a href={`https://etherscan.io/address/${f.feed}#readProxyContract`} target="_blank" rel="noreferrer" className="t-mono inline-flex items-center gap-1 text-[13px] text-accent hover:underline">
                        {f.feed.slice(0, 6)}…{f.feed.slice(-4)} <ArrowUpRight size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-hairline px-4 py-3 text-[13px] text-muted">
            The tenth listing, ACREDd, is ACRED with a 15-minute payout so a sale can be tried end to end today. Payout times for the daily-liquidity funds are illustrative. On Arc the fund tokens are stand-ins, because the real ones only move between issuer-approved wallets. The prices are real.
          </p>
        </Reveal>
      </Section>

      <Section
        center
        eyebrow="Pricing"
        title="A disclosed spread, not a negotiated discount."
        lede="Spread = base + vault usage + volatility × √(time to payout) + issuer credit. A 90-day ACRED claim with an empty vault:"
      >
        <div className="grid gap-4 text-left lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Reveal className="card h-full p-7">
            <div className="text-[17px] font-semibold">Where the 5.97% goes</div>
            <SpreadBar className="mt-5" bps={[50, 0, 397, 150]} />
            <DataRows
              className="mt-5"
              rows={[
                ["Base", "0.50%", "cost of running the vault"],
                ["Vault usage", "0.00%", "rises as USDC is deployed"],
                ["Time to payout", "3.97%", "8% vol × √(90 / 365)"],
                ["Issuer credit", "1.50%", "late or short payout"],
                [<strong key="t" className="text-ink">Spread</strong>, <strong key="v">5.97%</strong>, "you keep 94.03% of NAV"],
              ]}
            />
          </Reveal>
          <Reveal delay={0.08} className="card h-full p-7">
            <div className="text-[17px] font-semibold">Waiting is the main cost</div>
            <p className="mt-1 text-[15px] text-muted">It grows with the square root of time, so a short wait costs very little.</p>
            <SpreadCurve className="mt-5" baseBps={50} utilBps={0} creditBps={150} volBps={800} marks={[{ days: 90, label: "ACRED 90 days" }, { days: 0.0104, label: "Demo 15 min" }]} />
          </Reveal>
        </div>
      </Section>

      <Section tint center eyebrow="Controls" title="The contract decides. The interface cannot overrule it.">
        <div className="card mx-auto max-w-5xl p-4 sm:p-8">
          <VerdictDiagram />
        </div>
      </Section>

      <Section center eyebrow="Where the price comes from" title="Chainlink sets the price. Arc settles it. Arkiv records it.">
        <div className="card mx-auto max-w-5xl p-4 sm:p-8">
          <OracleDiagram />
        </div>
      </Section>

      <Section id="verify" center eyebrow="For judges" title="Verify it in two minutes." lede="Every claim on this page links to its proof: a contract, a transaction, a log or a query you can run yourself.">
        <Grid cols={3}>
          {proofs.map((p) => (
            <div key={p.claim} className="card flex h-full flex-col p-7 text-left">
              <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{p.claim}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{p.how}</p>
              {p.href.startsWith("http") ? (
                <a href={p.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-[15px] font-medium text-accent hover:underline">
                  {p.cta} <ArrowUpRight size={15} />
                </a>
              ) : (
                <Link href={p.href} className="mt-5 inline-flex items-center gap-0.5 text-[15px] font-medium text-accent hover:underline">
                  {p.cta} <ChevronRight size={16} />
                </Link>
              )}
            </div>
          ))}
        </Grid>
        <Reveal className="card mx-auto mt-8 max-w-3xl p-7 text-left">
          <div className="text-[17px] font-semibold">Try it yourself</div>
          <ol className="mt-3 grid gap-2 text-[15px] text-ink-2 sm:grid-cols-3">
            <li>
              <span className="font-semibold text-accent">1.</span> Open the app and connect a wallet on Arc testnet.
            </li>
            <li>
              <span className="font-semibold text-accent">2.</span> Press Try as judge to get demo fund tokens and gas.
            </li>
            <li>
              <span className="font-semibold text-accent">3.</span> Sell 0.001 ACREDd and watch it appear in the book.
            </li>
          </ol>
        </Reveal>
      </Section>

      <Section tint center eyebrow="Glossary" title="Every abbreviation, spelled out.">
        <Reveal className="card mx-auto grid max-w-5xl gap-x-10 p-7 text-left sm:grid-cols-2">
          {Object.entries(GLOSSARY).map(([k, g]) => (
            <div key={k} className="border-b border-hairline py-3.5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
              <div className="text-[15px]">
                <span className="font-semibold">{k}</span> <span className="text-muted">·</span> {g.full}
              </div>
              <p className="mt-0.5 text-[14px] text-muted">{g.say}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section center eyebrow="Disclosure" title="What is real, and what stands in.">
        <Reveal className="card mx-auto max-w-4xl overflow-hidden text-left">
          <table className="tbl">
            <thead>
              <tr>
                <th>Component</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["ACRED NAV", "Real", "Chainlink feed on Ethereum mainnet"],
                ["USDC and every Earlyout contract", "Real", "Arc testnet"],
                ["CRE workflow and reports", "Real", "Simulated with broadcast on Arc"],
                ["Order book", "Real", "Arkiv Rabdi testnet"],
                ["Fund tokens", "Stand-in", "Real ones only move between issuer-approved wallets"],
                ["Issuer redemption desk", "Stand-in", "Same reason"],
                ["Issuer status API", "Stand-in", "In production, the issuer's attestation"],
              ].map(([c, s, n]) => (
                <tr key={c}>
                  <td className="!whitespace-normal font-medium">{c}</td>
                  <td>
                    <span className={`badge ${s === "Real" ? "bg-buy-soft text-buy" : "bg-refuse-soft text-refuse"}`}>{s}</span>
                  </td>
                  <td className="hidden !whitespace-normal text-muted sm:table-cell">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <section>
        <Container className="py-24 text-center sm:py-32">
          <Reveal>
            <h2 className="t-page mx-auto max-w-2xl">Stop waiting for the window.</h2>
            <p className="t-lede mx-auto mt-4 max-w-xl text-[19px]">One transaction, with the price explained before you sign.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
              <CTA href="/sell">Try a sale</CTA>
              <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[17px] text-accent hover:underline">
                View source <ChevronRight size={18} />
              </a>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
