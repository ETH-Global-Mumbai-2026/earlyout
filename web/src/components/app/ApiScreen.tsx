"use client";

import { Mail } from "lucide-react";
import { EndpointList } from "../site/EndpointList";
import { TermSheet } from "../ui/TermSheet";
import { buttonClass } from "../ui/buttonClass";
import { Spinner } from "../ui/primitives";
import { useFunds, useQuote } from "@/hooks/useEarlyout";
import { COPY } from "@/lib/copy";
import { HERO_PROBE } from "@/lib/perUnit";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/site";
import { toWire } from "@/lib/wire";

const C = COPY.app.api;
const MAILTO = `mailto:${PLATFORM_CONTACT_EMAIL}?subject=${encodeURIComponent("Earlyout API access")}`;

/// The read API: endpoints, one live example, what the quote fields mean, and
/// how to ask for a key. No forms and no keys on the page.
export function ApiScreen() {
  const funds = useFunds();
  const fund = funds.data?.find((f) => f.symbol === "ACRED");
  const quote = useQuote(fund?.address, fund ? HERO_PROBE : null);
  const body = quote.data ? JSON.stringify(JSON.parse(toWire(quote.data)), null, 2) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
        <section aria-label={C.endpoints}>
          <h2 className="t-label mb-3">{C.endpoints}</h2>
          <EndpointList />
          <p className="t-caption mt-3">{C.endpointsNote}</p>
        </section>

        <section aria-label={C.fields}>
          <h2 className="t-label mb-3">{C.fields}</h2>
          <dl className="border-y border-ink">
            {C.fieldNotes.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-hairline py-2.5 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4">
                <dt className="font-mono text-[13px] text-ink">{k}</dt>
                <dd className="text-[14px] text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
        <section aria-label="Example response">
          <h2 className="t-label mb-3">{C.example}</h2>
          <TermSheet header="GET /api/quote" aside={body ? "200 OK" : undefined}>
            <div className="t-mono py-2 text-[12px] text-muted">
              <span className="block">?fund={fund ? `${fund.address.slice(0, 10)}…` : "0x…"}</span>
              <span className="block">&amp;amount={HERO_PROBE.toString()}</span>
            </div>
            {body ? (
              <pre className="max-h-[360px] overflow-auto rounded-[4px] bg-sunk p-3 font-mono text-[12px] leading-relaxed text-ink-2">{body}</pre>
            ) : (
              <div className="grid h-40 place-items-center text-muted">
                <Spinner />
              </div>
            )}
          </TermSheet>
          <p className="t-caption mt-3">{C.exampleNote}</p>
        </section>

        <section aria-label={C.accessTitle} className="border-y border-ink py-5">
          <h2 className="t-headline">{C.accessTitle}</h2>
          <p className="mt-2 text-[14px] text-ink-2">{C.keysNote}</p>
          <a href={MAILTO} className={`${buttonClass("primary", "md")} mt-4`}>
            <Mail size={16} aria-hidden />
            {C.requestAccess}
          </a>
        </section>
      </div>
    </div>
  );
}
