interface Props {
  value: string
  symbol: string
  onChange: (value: string) => void
  balanceLabel?: string
  onMax?: () => void
}

export function AmountInput({ value, symbol, onChange, balanceLabel, onMax }: Props) {
  return (
    <div className="inner rounded-2xl p-4">
      <label htmlFor="amount" className="label">
        Amount to sell
      </label>
      <div className="mt-1 flex items-baseline gap-2">
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder="0.001"
          onChange={(e) => {
            const next = e.target.value.replace(/,/g, '.')
            if (next === '' || /^\d*\.?\d{0,18}$/.test(next)) onChange(next)
          }}
          className="display w-full min-w-0 bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-30"
          style={{ color: 'var(--ink)' }}
        />
        <span className="text-base font-medium" style={{ color: 'var(--subtle)' }}>
          {symbol}
        </span>
      </div>
      <div className="mt-2 flex min-h-6 items-center justify-between text-xs" style={{ color: 'var(--subtle)' }}>
        <span>Fund units, 18 decimals</span>
        {balanceLabel && onMax ? (
          <button type="button" onClick={onMax} className="font-semibold" style={{ color: 'var(--accent)' }}>
            {balanceLabel} · Max
          </button>
        ) : null}
      </div>
    </div>
  )
}
