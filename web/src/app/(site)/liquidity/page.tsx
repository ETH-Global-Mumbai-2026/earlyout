import type { Metadata } from "next";
import { CTA, PageHeader, Section } from "@/components/site/blocks";
import { VaultFigures } from "@/components/site/VaultFigures";
import { SpreadExplorer } from "@/components/diagrams/SpreadExplorer";
import { COPY } from "@/lib/copy";

const C = COPY.liquidity;

export const metadata: Metadata = { title: C.meta.title };

export default function Liquidity() {
  const risks = [C.risks.issuer, C.risks.impairment, C.risks.withdrawals];
  return (
    <>
      <PageHeader glass eyebrow={C.kicker} title={C.title} lede={C.lede} />

      <Section layout="bleed" title={C.live.title}>
        <VaultFigures />
      </Section>

      <Section tint layout="split" title={C.buys.title} lede={C.buys.lede}>
        <ul className="grid gap-4 text-[15px] leading-relaxed text-ink-2">
          {C.buys.points.map((p) => (
            <li key={p} className="border-t border-ink pt-3">
              {p}
            </li>
          ))}
        </ul>
      </Section>

      <Section layout="split" title={C.earns.title} lede={C.earns.lede}>
        <div className="sheet p-5 sm:p-6">
          <SpreadExplorer baseBps={50} utilBps={0} creditBps={150} volBps={800} />
        </div>
      </Section>

      <Section tint title={C.risks.title}>
        <div className="grid gap-px overflow-hidden border-y border-hairline bg-hairline md:grid-cols-3">
          {risks.map((r) => (
            <div key={r.title} className="bg-surface-2 p-6">
              <h3 className="text-[17px] font-medium text-ink">{r.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{r.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <CTA href="/vault">{C.cta}</CTA>
      </Section>
    </>
  );
}
