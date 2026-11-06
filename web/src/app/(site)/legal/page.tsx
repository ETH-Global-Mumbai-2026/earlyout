import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/site/blocks";

export const metadata: Metadata = { title: "Testnet notice" };

const points: [string, string][] = [
  ["Testnet only", "Every contract runs on Arc testnet and holds test USDC with no monetary value. Nothing here is a live financial product."],
  ["Not investment advice", "Nothing on this site is an offer to buy or sell a security, or advice about any fund."],
  ["Stand-ins", "The fund tokens, the issuer's redemption desk and the issuer status API are stand-ins built for the demo. ACRED is referenced as an example; its NAV is read from Chainlink's public feed."],
  ["No affiliation", "Earlyout is not affiliated with, endorsed by or sponsored by Apollo, Securitize, Circle, Chainlink or Arkiv."],
  ["Open source", "The code is MIT licensed and provided as is, without warranty of any kind."],
  ["Data", "Wallet addresses you connect are read from public chains. Claims you sell are written to Arkiv, a public database, and expire on their payout date. We do not collect personal data."],
];

export default function Legal() {
  return (
    <>
      <PageHeader eyebrow="Testnet notice" title="Read this before you click anything." />
      <Section>
        <div className="hairline-rows max-w-3xl">
          {points.map(([t, d]) => (
            <div key={t} className="py-5">
              <h2 className="t-headline">{t}</h2>
              <p className="t-body mt-2 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
