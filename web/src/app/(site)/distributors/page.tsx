import type { Metadata } from "next";
import { CTA, Code, Grid, PageHeader, Section, Tile } from "@/components/site/blocks";
import { REPO } from "@/components/site/links";

export const metadata: Metadata = { title: "For distributors and issuers" };

export default function Distributors() {
  return (
    <>
      <PageHeader
        eyebrow="For distributors and issuers"
        title="Give your clients an exit between windows."
        lede="Real fund tokens only move between wallets you approve. You keep the eligibility. Earlyout brings the liquidity."
      />
      <Section eyebrow="What you get" title="Liquidity without changing the fund.">
        <Grid cols={3}>
          <Tile index="01" title="No change to redemption terms">
            The fund still redeems on its schedule. Earlyout buys the pending payout, so the fund&apos;s gate and cash management stay intact.
          </Tile>
          <Tile index="02" title="Your allowlist, enforced on chain">
            Fund tokens and claim tokens both check the allowlist on every transfer. Only wallets you approve can sell or buy claims.
          </Tile>
          <Tile index="03" title="A book you can audit">
            Every open claim, its price and the Arc transaction behind it sit on Arkiv, readable without our server.
          </Tile>
          <Tile index="04" title="Prices your clients can follow">
            Each quote names its four terms. No hidden fee, no negotiation, the same formula for every holder.
          </Tile>
          <Tile index="05" title="Failure handled in one transaction">
            If an issuer fails, trading halts and the writedown reaches every liquidity provider (LP) at once.
          </Tile>
          <Tile index="06" title="USDC settlement on Arc">
            Sellers receive USDC in the same transaction. Gas is paid in USDC too.
          </Tile>
        </Grid>
      </Section>
      <Section eyebrow="Your dashboard" title="Read your clients' open claims from Arkiv." lede="Filter by fund or payout date with the Arkiv SDK. The writer wallet proves the entries are Earlyout's.">
        <Code>{`const page = await client
  .select()
  .from(Claims)                       // schema "earlyout.claims"
  .where(eq("status", "open"))
  .ownedBy("0x343F684dAFFf216CDf38a40888662148eBa07Fd7")
  .orderBy(asc("settleAt"))
  .fetch()`}</Code>
      </Section>
      <Section eyebrow="Talk to us" title="Listing a fund takes one registry call." lede="Tell us the fund, its settlement delay and window, and its net asset value (NAV) feed. We set the exposure cap and credit term with you.">
        <div className="flex flex-wrap gap-3">
          <CTA href={`${REPO}/issues/new?title=Fund%20listing%20request`}>Request a listing</CTA>
          <CTA href="/developers" variant="secondary">
            Integration details
          </CTA>
        </div>
      </Section>
    </>
  );
}
