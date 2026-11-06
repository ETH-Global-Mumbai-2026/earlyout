import { VERDICTS, pct, units18, usdc } from '../lib/earlyout'

export interface QuoteData {
  verdict: number
  reason: string
  nav: bigint
  navUpdatedAt: bigint
  baseBps: number
  utilBps: number
  timeBps: number
  creditBps: number
  payout: bigint
  capacityLeft: bigint
}

interface Props {
  quote: QuoteData | undefined
  hasAmount: boolean
  isLoading: boolean
  isError: boolean
}

const TERMS = [
  { key: 'baseBps', label: 'Base', opacity: 1 },
  { key: 'utilBps', label: 'Utilisation', opacity: 0.72 },
  { key: 'timeBps', label: 'Time to payout', opacity: 0.48 },
  { key: 'creditBps', label: 'Issuer credit', opacity: 0.28 },
] as const

export function QuotePanel({ quote, hasAmount, isLoading, isError }: Props) {
  if (!hasAmount) {
    return (
      <div className="inner rounded-2xl p-4 text-sm" style={{ color: 'var(--subtle)' }}>
        Enter an amount to see a live quote from the vault.
      </div>
    )
  }
  if (isError) {
    return (
      <div className="inner rounded-2xl p-4 text-sm" style={{ color: 'var(--danger)' }}>
        Could not load the quote. Check your connection, it retries automatically.
      </div>
    )
  }
  if (!quote) {
    return (
      <div className="inner rounded-2xl p-4 text-sm" style={{ color: 'var(--subtle)' }}>
        {isLoading ? 'Requesting quote...' : 'No quote available.'}
      </div>
    )
  }

  const verdict = VERDICTS[quote.verdict] ?? VERDICTS[1]
  const tone = verdict.tone === 'success' ? 'var(--success)' : 'var(--danger)'
  const total = quote.baseBps + quote.utilBps + quote.timeBps + quote.creditBps

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="inner rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="label">Verdict</span>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold tracking-wider"
            style={{ color: tone, border: `1px solid ${tone}` }}
          >
            {verdict.label}
          </span>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          {quote.reason ? quote.reason : verdict.blurb}
        </p>
      </div>

      <div className="inner rounded-2xl p-4">
        <span className="label">You receive</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {usdc(quote.payout, 6)}
          </span>
          <span className="text-base font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>
        <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
          NAV {units18(quote.nav, 4)} per unit, minus a {pct(total)} spread. Vault capacity left {usdc(quote.capacityLeft, 2)} USDC.
        </p>
      </div>

      <div className="inner rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="label">Spread</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
            {pct(total)}
          </span>
        </div>

        <div
          className="mt-3 flex h-3 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--surface-muted)' }}
          role="img"
          aria-label={`Spread ${pct(total)}: ${TERMS.map((t) => `${t.label} ${pct(quote[t.key])}`).join(', ')}`}
        >
          {TERMS.map((t) =>
            quote[t.key] > 0 ? (
              <div
                key={t.key}
                title={`${t.label} ${pct(quote[t.key])}`}
                style={{
                  width: `${total === 0 ? 0 : (quote[t.key] / total) * 100}%`,
                  background: 'var(--accent)',
                  opacity: t.opacity,
                  borderRight: '1px solid var(--bg)',
                }}
              />
            ) : null,
          )}
        </div>

        <ul className="mt-3 space-y-1.5">
          {TERMS.map((t) => (
            <li key={t.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                <span className="size-2.5 rounded-sm" style={{ background: 'var(--accent)', opacity: t.opacity }} />
                {t.label}
              </span>
              <span className="tabular-nums" style={{ color: 'var(--muted)' }}>
                {quote[t.key]} bps <span style={{ color: 'var(--subtle)' }}>({pct(quote[t.key])})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
