import type { Metadata } from "next";
import { CTA, DataRows, PageHeader, Section } from "@/components/site/blocks";
import { REPO } from "@/components/site/links";

export const metadata: Metadata = { title: "Security" };

export default function Security() {
  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Reviewed, tested, and plain about what is left."
        lede="The contracts went through Arc Studio's security review and Slither before deployment. This is a hackathon build on testnet, not audited software."
      />
      <Section eyebrow="Review" title="Five Medium findings fixed, one High left open by decision.">
        <div className="card max-w-3xl p-6">
          <DataRows
            rows={[
              ["M1 fixed", "LP exit before a writedown", "LP flows pause until markImpaired"],
              ["M2 fixed", "Future-dated NAV could freeze a fund", "reports over 5 min ahead rejected"],
              ["M3 fixed", "Shared CRE forwarder", "optional workflow owner and id pinning"],
              ["M4 fixed", "Settlement on a bad NAV", "settle reverts, retry later"],
              ["M5 fixed", "Allowlist skipped on depositAndSell", "both entry paths enforce it"],
              ["H1 open", "LP gain sniping at settlement", "accepted for testnet, see below"],
            ]}
          />
        </div>
        <p className="t-caption mt-4">63 Foundry tests pass. Full report and proof of concept in docs/studio in the repository.</p>
      </Section>
      <Section
        eyebrow="Open finding"
        title="Late deposits can take part of a settlement gain."
        lede="Claims are held at cost and the whole gain lands when settle runs. Capital that deposits just before and leaves right after takes a share of a gain that earlier LPs funded. The fix before real money is to accrue claim value linearly to the payout date inside totalAssets."
      />
      <Section eyebrow="Trust" title="What you are trusting today.">
        <div className="card max-w-3xl p-6">
          <DataRows
            rows={[
              ["Ops wallet", "owns every contract", "can list funds and set terms"],
              ["Oracle forwarder", "ops wallet or CRE", "can write NAV and status"],
              ["Keeper", "anyone", "must call settle at maturity"],
              ["Stand-ins", "fund, issuer, status API", "real ones are permissioned"],
            ]}
          />
        </div>
      </Section>
      <Section eyebrow="Report an issue" title="Found something? Tell us." lede="Open an issue in the repository. Never post private keys or seed phrases.">
        <CTA href={`${REPO}/issues/new?title=Security%20report`}>Report an issue</CTA>
      </Section>
    </>
  );
}
