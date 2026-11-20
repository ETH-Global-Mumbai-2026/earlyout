import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/site/blocks";
import { COPY } from "@/lib/copy";

const C = COPY.legal;

export const metadata: Metadata = { title: C.meta.title };

export default function Legal() {
  return (
    <>
      <PageHeader eyebrow={C.kicker} title={C.title} />
      <Section>
        <dl className="grid max-w-3xl border-y border-ink">
          {C.points.map((p) => (
            <div key={p.title} className="grid gap-1 border-b border-hairline py-5 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
              <dt className="text-[15px] font-medium text-ink">{p.title}</dt>
              <dd className="text-[15px] leading-relaxed text-ink-2">{p.body}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section tint title={C.realTitle}>
        <div className="overflow-x-auto border-y border-ink">
          <table className="tbl min-w-[560px]" aria-label={C.realTitle}>
            <thead>
              <tr>
                <th>Part</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {C.real.map((r) => (
                <tr key={r.part}>
                  <td className="!whitespace-normal text-ink">{r.part}</td>
                  <td>
                    <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${r.status === "Real" ? "text-buy" : "text-refuse"}`}>{r.status}</span>
                  </td>
                  <td className="!whitespace-normal text-ink-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
