import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CTA, Container, Section } from "@/components/site/blocks";
import { Hero } from "@/components/site/Hero";
import { SiteFunds } from "@/components/site/SiteFunds";
import { Reveal } from "@/components/motion/Reveal";
import { GateCalendar } from "@/components/diagrams/GateCalendar";
import { SaleFlow } from "@/components/diagrams/SaleFlow";
import { SpreadExplorer } from "@/components/diagrams/SpreadExplorer";
import { VerdictTree } from "@/components/diagrams/VerdictTree";
import { GlassBackdrop } from "@/components/art/GlassBackdrop";
import { GLASS_BG } from "@/components/art/glass";
import { HoldersMark, LiquidityMark, PlatformsMark } from "@/components/art/Engravings";
import { COPY } from "@/lib/copy";

const H = COPY.home;

export default function Landing() {
  const doors = [
    { href: "/holders", Mark: HoldersMark, ...H.audiences.holders },
    { href: "/liquidity", Mark: LiquidityMark, ...H.audiences.liquidity },
    { href: "/platforms", Mark: PlatformsMark, ...H.audiences.platforms },
  ];
  return (
    <>
      <div className={`relative overflow-hidden ${GLASS_BG}`}>
        <GlassBackdrop />
        <div className="relative">
          <Hero />
        </div>
      </div>

      <Section tint layout="split" kicker={H.problem.kicker} title={H.problem.title} lede={H.problem.lede}>
        <ul className="grid gap-6 sm:grid-cols-3">
          {H.problem.points.map((p) => (
            <li key={p.title} className="border-t border-ink pt-3">
              <div className="text-[15px] font-medium text-ink">{p.title}</div>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{p.body}</p>
            </li>
          ))}
        </ul>
        <Reveal className="mt-10">
          <GateCalendar />
          <p className="t-caption mt-3">{H.problem.gateCaption}</p>
        </Reveal>
      </Section>

      <Section kicker={H.flow.kicker} title={H.flow.title} lede={H.flow.lede}>
        <Reveal className="sheet p-4 sm:p-8">
          <SaleFlow />
        </Reveal>
      </Section>

      <Section tint layout="split" kicker={H.pricing.kicker} title={H.pricing.title} lede={H.pricing.lede}>
        <div className="sheet p-5 sm:p-6">
          <div className="t-label">{H.pricing.exampleTitle}</div>
          <SpreadExplorer baseBps={50} utilBps={0} creditBps={150} volBps={800} />
          <p className="t-caption mt-4">{H.pricing.exampleNote}</p>
        </div>
      </Section>

      <Section layout="bleed" kicker={H.funds.kicker} title={H.funds.title} lede={H.funds.lede}>
        <SiteFunds />
      </Section>

      <Section tint kicker={H.controls.kicker} title={H.controls.title} lede={H.controls.lede}>
        <Reveal className="sheet p-4 sm:p-8">
          <VerdictTree />
        </Reveal>
      </Section>

      <Section layout="bleed" kicker={H.audiences.kicker} title={H.audiences.title}>
        <div className="grid gap-px overflow-hidden border-y border-hairline bg-hairline md:grid-cols-3">
          {doors.map(({ href, Mark, title, body, cta }) => (
            <Link key={href} href={href} className="group flex flex-col bg-canvas p-6 hover:bg-surface-2 sm:p-8">
              <Mark className="size-14 text-brand" />
              <h3 className="t-title mt-6 font-serif">{title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-2">{body}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink">
                {cta} <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <section className={`relative overflow-hidden ${GLASS_BG}`}>
        <GlassBackdrop wash="center" />
        <Container className="relative py-24 text-center sm:py-32">
          <Reveal>
            <h2 className="t-hero mx-auto max-w-3xl">{H.closing.title}</h2>
            <p className="t-lede mx-auto mt-5 max-w-xl !text-ink">{H.closing.lede}</p>
            <div className="mt-9">
              <CTA href="/sell">{H.closing.cta}</CTA>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
