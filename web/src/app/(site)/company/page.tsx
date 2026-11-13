import type { Metadata } from "next";
import { CTA, PageHeader, Section } from "@/components/site/blocks";
import { REPO, STUDIO } from "@/components/site/links";
import { COPY } from "@/lib/copy";

const C = COPY.company;

export const metadata: Metadata = { title: C.meta.title };

export default function Company() {
  return (
    <>
      <PageHeader eyebrow={C.kicker} title={C.title} lede={C.lede} />
      <Section layout="split" title={C.story.title}>
        <p className="t-lede max-w-2xl text-ink-2">{C.story.body}</p>
      </Section>
      <Section tint layout="split" title={C.mission.title}>
        <p className="t-lede max-w-2xl text-ink-2">{C.mission.body}</p>
      </Section>
      <Section layout="split" title={C.team.title}>
        <ul className="border-y border-ink">
          {C.team.members.map((m) => (
            <li key={m.name} className="flex items-baseline justify-between gap-4 border-b border-hairline py-4 last:border-b-0">
              <span className="font-serif text-[1.5rem] leading-tight text-ink">{m.name}</span>
              <span className="t-label">{m.role}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section tint title={C.open.title}>
        <div className="flex flex-wrap gap-3">
          <CTA href={REPO}>{C.open.github}</CTA>
          <CTA href={STUDIO} variant="secondary">
            {C.open.studio}
          </CTA>
        </div>
        <p className="t-caption mt-6">{COPY.footer.affiliation}</p>
      </Section>
    </>
  );
}
