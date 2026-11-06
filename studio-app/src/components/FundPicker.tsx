import { useReadContracts } from 'wagmi'
import { ADDRESSES, CHAIN_ID, FUNDS, formatDuration, oracleAbi, registryAbi, units18 } from '../lib/earlyout'

interface Props {
  selected: number
  onSelect: (index: number) => void
}

export function FundPicker({ selected, onSelect }: Props) {
  const { data, isLoading, isError } = useReadContracts({
    contracts: FUNDS.flatMap((f) => [
      { address: ADDRESSES.oracle, abi: oracleAbi, functionName: 'getNav', args: [f.address], chainId: CHAIN_ID },
      { address: ADDRESSES.registry, abi: registryAbi, functionName: 'getTerms', args: [f.address], chainId: CHAIN_ID },
    ] as const),
    query: { refetchInterval: 30_000 },
  })

  return (
    <div role="radiogroup" aria-label="Fund" className="grid gap-3 sm:grid-cols-2">
      {FUNDS.map((fund, i) => {
        const nav = data?.[i * 2]?.result as readonly [bigint, bigint, number] | undefined
        const terms = data?.[i * 2 + 1]?.result as { settlementDelay: bigint; window: bigint } | undefined
        const active = i === selected
        return (
          <button
            key={fund.address}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(i)}
            className="min-h-11 rounded-2xl p-4 text-left transition-colors"
            style={{
              background: active ? 'var(--surface-strong)' : 'transparent',
              border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="display text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                {fund.symbol}
              </span>
              <span className="label">{terms ? `Pays in ${formatDuration(terms.settlementDelay)}` : isLoading ? 'Loading' : ''}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {isError ? 'Unavailable' : units18(nav?.[0], 4)}
              </span>
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                NAV per unit
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
              {fund.name}
            </p>
          </button>
        )
      })}
    </div>
  )
}
