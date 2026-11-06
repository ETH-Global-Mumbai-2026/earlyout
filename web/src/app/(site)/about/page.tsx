import type { Metadata } from "next";
import { CTA, DataRows, PageHeader, Section } from "@/components/site/blocks";
import { REPO, STUDIO } from "@/components/site/links";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="We sell the wait."
        lede="Earlyout started at ETHGlobal Mumbai 2026 from one question: tokenized funds settle on chain, so why do their investors still wait for a quarter to get out?"
      />
      <Section eyebrow="Mission" title="Make scheduled redemptions liquid, without bending the fund's rules.">
        <p className="t-lede max-w-2xl">
          Gated funds exist for good reasons. Earlyout leaves the gate in place and puts a market in front of it: a vault that pays now and
          waits instead of the investor, at a price anyone can check.
        </p>
      </Section>
      <Section eyebrow="Facts" title="Where things stand.">
        <div className="card max-w-3xl p-6">
          <DataRows
            rows={[
              ["Built", "ETHGlobal Mumbai", "November 2026"],
              ["Network", "Arc testnet", "chain 5042002"],
              ["Contracts", "7 + deploy script", "63 tests"],
              ["Partners", "Arc, Chainlink CRE, Arkiv", "hackathon tracks"],
              ["Licence", "MIT", "open source"],
            ]}
          />
        </div>
      </Section>
      <Section eyebrow="Follow along" title="Everything is in the open.">
        <div className="flex flex-wrap gap-3">
          <CTA href={REPO}>GitHub</CTA>
          <CTA href={STUDIO} variant="secondary">
            Arc Studio project
          </CTA>
        </div>
        <p className="t-caption mt-6">Earlyout is not affiliated with Apollo, Securitize, Circle, Chainlink or Arkiv.</p>
      </Section>
    </>
  );
}
