import type { Metadata } from "next";
import Link from "next/link";
import { CTA, Code, PageHeader, Section } from "@/components/site/blocks";
import { EndpointList } from "@/components/site/EndpointList";
import { COPY } from "@/lib/copy";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/site";

const C = COPY.platforms;

export const metadata: Metadata = { title: C.meta.title };

export default function Platforms() {
  return (
    <>
      <PageHeader glass eyebrow={C.kicker} title={C.title} lede={C.lede} />

      <Section>
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {C.points.map((p, i) => (
            <div key={p.title} className="border-t border-ink pt-4">
              <div className="t-label">0{i + 1}</div>
              <h3 className="mt-2 text-[17px] font-medium text-ink">{p.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tint layout="split" title={C.api.title} lede={C.api.lede}>
        <EndpointList />
        <Link href="/api-access" className="mt-5 inline-block text-[14px] font-medium text-ink underline underline-offset-4">
          {C.api.link}
        </Link>
      </Section>

      <Section layout="split" title={C.arkiv.title} lede={C.arkiv.lede}>
        <Code>{`const page = await client
  .select()
  .from(Claims)                       // schema "earlyout.claims"
  .where(eq("status", "open"))
  .ownedBy("0x343F684dAFFf216CDf38a40888662148eBa07Fd7")
  .orderBy(asc("settleAt"))
  .fetch()`}</Code>
      </Section>

      <Section tint title={C.contact.title} lede={C.contact.lede}>
        <div className="flex flex-wrap gap-3">
          <CTA href={`mailto:${PLATFORM_CONTACT_EMAIL}?subject=Earlyout%20API%20access`}>{C.contact.cta}</CTA>
          <CTA href="/docs" variant="secondary">
            {C.docsLink}
          </CTA>
        </div>
      </Section>
    </>
  );
}
