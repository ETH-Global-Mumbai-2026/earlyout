import { Reveal } from "@/components/motion/Reveal";

const MAX = 90;
const rows: { who: string; note: string; days: number | null; label: string }[] = [
  { who: "Daily-liquidity fund", note: "USTB, JTRSY, USTBL and others", days: 1, label: "about 1 day" },
  { who: "ACRED, the normal way", note: "wait for the quarterly window", days: 90, label: "up to 90 days" },
  { who: "ACRED with Earlyout", note: "sell the pending redemption", days: null, label: "today, same transaction" },
];

/// The pitch in one chart: how long each holder waits for cash.
/// One measure, one hue; the Earlyout row has no bar because there is no wait.
export function CashWait() {
  return (
    <Reveal className="card mx-auto max-w-4xl p-7 text-left">
      <div className="text-[17px] font-semibold">Days until you get your cash</div>
      <p className="mt-1 text-[15px] text-muted">Tokenized money-market funds already pay within a day. Funds that redeem on a schedule do not, and that is the gap Earlyout fills.</p>
      <dl className="mt-6 grid gap-5">
        {rows.map((r) => (
          <div key={r.who} className="grid gap-2 sm:grid-cols-[13rem_1fr] sm:items-center sm:gap-5">
            <dt>
              <span className="block text-[15px] font-semibold">{r.who}</span>
              <span className="block text-[13px] text-muted">{r.note}</span>
            </dt>
            <dd className="flex items-center gap-3">
              {r.days === null ? (
                <span className="badge bg-buy-soft font-semibold text-buy">
                  <span className="badge-dot" />
                  Today
                </span>
              ) : (
                <span className="h-3 rounded-r-[4px] bg-viz-1" style={{ width: `max(8px, calc(${(r.days / MAX) * 100}% - 9rem))` }} title={`${r.who}: ${r.label}`} />
              )}
              <span className="num shrink-0 text-[14px] text-ink-2">{r.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}
