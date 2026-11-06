import { SaleFlowDiagram, VerdictDiagram } from "@/components/site/Diagrams";
import type { Metadata } from "next";
import { CTA, DataRows, Grid, PageHeader, Section, Tile } from "@/components/site/blocks";
import { SpreadCurve } from "@/components/viz/SpreadCurve";

export const metadata: Metadata = { title: "How it works" };

const faq: [string, string][] = [
  ["Who can sell?", "Holders whose wallet the fund's distributor has approved. The fund token and the claim token both enforce an allowlist, as real tokenized funds do."],
  ["What happens to my fund tokens?", "They join the issuer's redemption queue on your behalf. The claim to the payout goes to the vault, and you keep the USDC."],
  ["Why is the spread wider for longer waits?", "The time term grows with the square root of the time to payout, the way price uncertainty grows. A 15-minute demo claim costs a few basis points; a 90-day claim about 4%."],
  ["What if the issuer fails?", "The oracle reports it, every quote halts, and anyone can write the fund's claims down to their recovery value inside the vault's accounting, so every liquidity provider (LP)'s share price falls in one transaction."],
  ["Where does the NAV come from?", "Each fund's Chainlink NAV feed on Ethereum mainnet, carried to Arc by a Chainlink Runtime Environment (CRE) workflow that also reads the issuer's status."],
  ["Can I see every open claim?", "Yes. The Book screen reads them from Arkiv, and anyone can run the same query against Arkiv's public RPC."],
];

export default function HowItWorks() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="From pending redemption to USDC in one transaction."
        lede="Earlyout turns a redemption request into a claim token, prices it against the fund's real net asset value (NAV), and lets a USDC (USD Coin) vault on Arc buy it."
      />
      <Section eyebrow="The flow" title="Five steps, three of them automatic.">
        <div className="card mb-6 p-4 sm:p-8">
          <SaleFlowDiagram />
        </div>
        <Grid cols={3}>
          <Tile index="01" title="Deposit fund tokens">
            ClaimWrapper takes the tokens and files a redemption with the issuer. The payout date is the fund&apos;s settlement delay, rounded up to its window.
          </Tile>
          <Tile index="02" title="Mint a claim">
            One ERC-1155 (multi-token standard) claim id per fund and payout date, so claims for the same date are interchangeable.
          </Tile>
          <Tile index="03" title="Quote and sell">
            The vault quotes a verdict and a price. On BUY it takes the claim first, then pays USDC.
          </Tile>
          <Tile index="04" title="Hold or resell">
            The vault holds claims at cost, or sells them to an approved buyer at NAV minus the time and credit terms.
          </Tile>
          <Tile index="05" title="Settle">
            At the payout date anyone can call settle. The vault collects full NAV and LPs realise the spread.
          </Tile>
          <Tile index="06" title="Fail safely">
            If the issuer reports failure, trading halts and LP deposits and withdrawals pause until the writedown is marked.
          </Tile>
        </Grid>
      </Section>
      <Section eyebrow="Pricing" title="Four terms, all on screen." lede="The seller receives NAV × amount × (1 minus the spread). Terms are in basis points (bps): 100 bps is 1%.">
        <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <DataRows
            rows={[
              ["Base", "50 bps", "fixed, set in FundRegistry"],
              ["Vault usage", "0 to 300 bps", "300 × deployed USDC / total assets"],
              ["Time", "vol × √(years)", "800 bps volatility for ACRED"],
              ["Credit", "150 bps", "per fund, set in FundRegistry"],
            ]}
          />
        </div>
        <div className="card p-6">
          <div className="t-eyebrow">ACRED terms, empty vault</div>
          <SpreadCurve className="mt-4" baseBps={50} utilBps={0} creditBps={150} volBps={800} marks={[{ days: 90, label: "90 days" }]} />
        </div>
        </div>
      </Section>
      <Section eyebrow="Safety rules" title="What the contracts refuse to do.">
        <div className="card mb-6 p-4 sm:p-8">
          <VerdictDiagram />
        </div>
        <div className="card max-w-3xl p-6">
          <DataRows
            rows={[
              ["Exposure cap", "REFUSE", "per fund, in USDC"],
              ["Idle USDC", "REFUSE", "the vault never pays what it does not hold"],
              ["Claim due", "REFUSE", "matured claims settle, they do not trade"],
              ["Stale NAV", "HALT", "older than the fund's limit, 4 days for ACRED"],
              ["Issuer failed", "HALT", "reported in the same CRE report as the NAV"],
              ["Written down", "HALT", "until the issuer recovers and the owner clears it"],
            ]}
          />
        </div>
      </Section>
      <Section eyebrow="Questions" title="Frequently asked.">
        <div className="hairline-rows max-w-3xl">
          {faq.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="t-headline cursor-pointer list-none">
                <span className="mr-3 font-semibold text-accent group-open:hidden">+</span>
                <span className="mr-3 hidden font-semibold text-accent group-open:inline">−</span>
                {q}
              </summary>
              <p className="t-body mt-3 pl-7 text-muted">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10">
          <CTA href="/sell">Try it on testnet</CTA>
        </div>
      </Section>
    </>
  );
}
