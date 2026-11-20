import type { Metadata } from "next";
import { CTA, PageHeader, Section } from "@/components/site/blocks";
import { Reveal } from "@/components/motion/Reveal";
import { SaleFlow } from "@/components/diagrams/SaleFlow";
import { TermLine, TermSheet } from "@/components/ui/TermSheet";
import { VerdictStamp } from "@/components/ui/VerdictStamp";
import { COPY } from "@/lib/copy";

const C = COPY.holders;

export const metadata: Metadata = { title: C.meta.title };

const T = COPY.terms;
const terms: [string, string, string][] = [
  [T.base.label, "0.50%", T.base.say],
  [T.util.label, "0 to 3.00%", T.util.say],
  [T.time.label, "3.97% at 90 days", T.time.say],
  [T.credit.label, "1.50%", T.credit.say],
];

export default function Holders() {
  const verdicts = [
    { v: "BUY" as const, text: C.verdicts.buy },
    { v: "REFUSE" as const, text: C.verdicts.refuse },
    { v: "HALT" as const, text: C.verdicts.halt },
  ];
  const after = [C.after.now, C.after.waiting, C.after.payout];
  return (
    <>
      <PageHeader glass eyebrow={C.kicker} title={C.title} lede={C.lede} />

      <Section title={C.flow.title} lede={C.flow.lede}>
        <Reveal className="sheet p-4 sm:p-8">
          <SaleFlow />
        </Reveal>
      </Section>

      <Section tint layout="split" title={C.anatomy.title} lede={C.anatomy.lede}>
        <TermSheet raised header="Example · ACRED · 90 days before payout" stamp={{ verdict: "BUY" }}>
          {terms.map(([label, value, hint]) => (
            <TermLine key={label} label={label} hint={hint} value={value} tone="neg" />
          ))}
          <TermLine label={T.total} value="5.97%" tone="strong" />
          <TermLine label="You keep" value="94.03% of the fund price" tone="strong" />
        </TermSheet>
      </Section>

      <Section title={C.verdicts.title}>
        <div className="grid gap-px overflow-hidden border-y border-hairline bg-hairline md:grid-cols-3">
          {verdicts.map(({ v, text }) => (
            <div key={v} className="bg-canvas p-6">
              <VerdictStamp verdict={v} animate={false} className="!rotate-0 text-[13px]" />
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tint layout="split" title={C.after.title}>
        <ol className="grid gap-6">
          {after.map((a, i) => (
            <li key={a.title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-ink pt-4">
              <span className="t-label pt-1">0{i + 1}</span>
              <span>
                <span className="block text-[17px] font-medium text-ink">{a.title}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-ink-2">{a.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <CTA href="/sell">{C.cta}</CTA>
      </Section>
    </>
  );
}
