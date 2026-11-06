import { CTA, Container, DataRows, Grid, Section, Tile } from "@/components/site/blocks";
import { LiveHeroPanel } from "@/components/site/LiveCaption";
import { REPO } from "@/components/site/links";

export default function Landing() {
  return (
    <>
      <section className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-2">
        <div className="flex flex-col justify-between px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pb-12">
          <div>
            <div className="t-eyebrow">Earlyout · ETHGlobal Mumbai 2026</div>
            <h1 className="t-hero mt-6 max-w-xl">Early exit for funds that redeem on a schedule.</h1>
            <p className="t-lede mt-6 max-w-lg">
              Tokenized private credit funds let investors out once a quarter. Earlyout buys the pending redemption today, in USDC, at
              the fund&apos;s real NAV minus a spread that names its four reasons.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CTA href="/sell">Open the app</CTA>
              <CTA href="/how-it-works" variant="secondary">
                How it works
              </CTA>
            </div>
          </div>
          <DataRows
            className="mt-14 max-w-lg"
            rows={[
              ["Fund", "Apollo ACRED", "on Securitize"],
              ["Exit today", "quarterly window", "next quarter"],
              ["With Earlyout", "same transaction", "now"],
              ["Price", "NAV minus spread", "four terms"],
            ]}
          />
        </div>
        <LiveHeroPanel className="h-[46vh] border-t border-hairline lg:h-auto lg:border-l lg:border-t-0" />
      </section>

      <Section
        eyebrow="The problem"
        title="The fund is liquid on paper. The investor is not."
        lede="Private credit funds limit how much can leave each quarter. When redemption requests exceed the gate, investors wait. Tokenizing the fund did not change the schedule."
      >
        <Grid cols={3}>
          <Tile index="01" title="Quarterly windows">
            ACRED repurchases at least 5% of the fund each quarter and pays once the underlying fund pays.
          </Tile>
          <Tile index="02" title="No secondary market">
            The tokens only move between issuer-approved wallets, so a holder cannot simply sell them on an exchange.
          </Tile>
          <Tile index="03" title="Gates in 2026">
            Large private credit funds have gated redemptions this year. Holders who need cash have had nowhere to go.
          </Tile>
        </Grid>
      </Section>

      <Section eyebrow="How it works" title="Sell the wait, not the fund." lede="Four steps, one transaction for the seller.">
        <Grid cols={4}>
          <Tile index="01" title="Deposit">
            The holder deposits fund tokens. Earlyout files the redemption with the issuer.
          </Tile>
          <Tile index="02" title="Claim">
            A claim token is minted for that fund and payout date, one ERC-1155 id per date.
          </Tile>
          <Tile index="03" title="Sell">
            The vault buys the claim and pays USDC on Arc in the same transaction.
          </Tile>
          <Tile index="04" title="Settle">
            At the payout date the vault collects full NAV. LPs earn the spread.
          </Tile>
        </Grid>
      </Section>

      <Section
        eyebrow="Verdict first"
        title="Every quote says yes, no, or stop, before anything moves."
        lede="The verdict comes from the contract, not the interface, so a sale that should not happen cannot happen."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["BUY", "bg-buy", "The vault buys at the price shown. Fund exposure and idle USDC both allow it."],
            ["REFUSE", "bg-refuse", "The fund would pass its exposure cap, the vault is short of USDC, or the claim is already due."],
            ["HALT", "bg-halt", "The issuer reports failure, the NAV is stale, or the fund is written down."],
          ].map(([v, dot, text]) => (
            <div key={v} className="card p-6">
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className={`size-2 rounded-full ${dot}`} />
                {v}
              </div>
              <p className="t-body mt-3 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Pricing"
        title="A price that explains itself."
        lede="Spread = base + vault usage + volatility × √(time to payout) + issuer credit. A 90-day ACRED claim today:"
      >
        <div className="card max-w-2xl p-6">
          <DataRows
            rows={[
              ["Base", "0.50%", "cost of running the vault"],
              ["Vault usage", "0.00%", "rises as USDC is deployed"],
              ["Time to payout", "3.97%", "8% vol × √(90 / 365)"],
              ["Issuer credit", "1.50%", "risk of a late or short payout"],
              [<strong key="t" className="text-ink">Spread</strong>, <strong key="v">5.97%</strong>, "seller keeps 94.03% of NAV"],
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Built on" title="Three networks, each doing one job.">
        <Grid cols={3}>
          <Tile index="ARC" title="Settlement in USDC">
            All contracts run on Arc testnet. USDC is the settlement asset and the gas token. Written, tested, reviewed and deployed in Arc
            Studio.
          </Tile>
          <Tile index="CHAINLINK" title="Real NAV, carried by CRE">
            A Chainlink CRE workflow reads the ACRED NAV feed on Ethereum mainnet and the issuer&apos;s status, and writes both to the
            oracle on Arc.
          </Tile>
          <Tile index="ARKIV" title="A public book of claims">
            Every open claim lives on Arkiv, queryable by anyone, and expires on its payout date. No server of ours is needed to read it.
          </Tile>
        </Grid>
      </Section>

      <Section eyebrow="Plain about it" title="What is real, and what stands in.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <div className="t-eyebrow text-buy">Real</div>
            <ul className="t-body mt-3 space-y-2">
              <li>The ACRED NAV, read from Chainlink&apos;s feed on Ethereum mainnet</li>
              <li>USDC on Arc, and every Earlyout contract</li>
              <li>The CRE workflow and its signed reports</li>
              <li>The Arkiv book</li>
            </ul>
          </div>
          <div className="card p-6">
            <div className="t-eyebrow text-refuse">Stand-in</div>
            <ul className="t-body mt-3 space-y-2">
              <li>Fund tokens: real ones only move between issuer-approved wallets</li>
              <li>The issuer&apos;s redemption desk, for the same reason</li>
              <li>The issuer status API: in production, the issuer&apos;s attestation</li>
            </ul>
          </div>
        </div>
      </Section>

      <section className="border-t border-hairline">
        <Container className="flex flex-col items-start justify-between gap-6 py-16 sm:flex-row sm:items-center sm:py-20">
          <h2 className="t-display max-w-xl">Try a sale on Arc testnet. It takes one transaction.</h2>
          <div className="flex flex-wrap gap-3">
            <CTA href="/sell">Open the app</CTA>
            <CTA href={REPO} variant="secondary">
              Read the code
            </CTA>
          </div>
        </Container>
      </section>
    </>
  );
}
