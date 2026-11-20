import type { Metadata } from "next";
import { CTA, PageHeader, Section } from "@/components/site/blocks";
import { REPO } from "@/components/site/links";
import { COPY } from "@/lib/copy";

const C = COPY.security;

export const metadata: Metadata = { title: C.meta.title };

const findings: [string, string, string][] = [
  ["M1 fixed", "LP exit before a writedown", "LP flows pause until markImpaired"],
  ["M2 fixed", "A future-dated NAV could freeze a fund", "Reports over 5 minutes ahead are rejected"],
  ["M3 fixed", "Shared CRE forwarder", "Optional workflow owner and id pinning"],
  ["M4 fixed", "Settlement on a bad NAV", "Settle reverts; retry later"],
  ["M5 fixed", "Allowlist skipped on depositAndSell", "Both entry paths enforce it"],
  ["H1 fixed", "LP gain sniping at settlement", "Claim value accrues to the payout date"],
];

const trust: [string, string, string][] = [
  ["Ops wallet", "Owns every contract", "Can list funds and set terms"],
  ["Oracle forwarder", "Ops wallet or CRE", "Can write NAV and issuer status"],
  ["Keeper", "Anyone", "Must call settle at maturity"],
  ["Stand-ins", "Fund, issuer, status API", "The real ones are permissioned"],
];

function Rows({ label, rows }: { label: string; rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto border-y border-ink">
      <table className="tbl min-w-[560px]" aria-label={label}>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={a}>
              <td className="font-mono text-[12px] text-ink">{a}</td>
              <td className="!whitespace-normal text-ink">{b}</td>
              <td className="!whitespace-normal text-ink-2">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Security() {
  return (
    <>
      <PageHeader eyebrow={C.kicker} title={C.title} lede={C.lede} />
      <Section layout="split" title={C.review.title} lede={C.review.note}>
        <Rows label="Review findings" rows={findings} />
      </Section>
      <Section tint layout="split" title={C.open.title}>
        <p className="t-lede max-w-2xl text-ink-2">{C.open.body}</p>
      </Section>
      <Section layout="split" title={C.trust.title}>
        <Rows label="Trust assumptions" rows={trust} />
      </Section>
      <Section tint title={C.report.title} lede={C.report.lede}>
        <CTA href={`${REPO}/issues/new?title=Security%20report`}>{C.report.cta}</CTA>
      </Section>
    </>
  );
}
