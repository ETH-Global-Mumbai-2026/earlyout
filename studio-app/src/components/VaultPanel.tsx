import { useReadContract, useReadContracts } from 'wagmi'
import { ADDRESSES, CHAIN_ID, erc20BalanceAbi, usdc, vaultAbi } from '../lib/earlyout'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { ExternalLink } from 'lucide-react'

export function VaultPanel() {
  const { data: decimals } = useReadContract({
    address: ADDRESSES.vault,
    abi: vaultAbi,
    functionName: 'decimals',
    chainId: CHAIN_ID,
  })

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      { address: ADDRESSES.vault, abi: vaultAbi, functionName: 'totalAssets', chainId: CHAIN_ID },
      { address: ADDRESSES.usdc, abi: erc20BalanceAbi, functionName: 'balanceOf', args: [ADDRESSES.vault], chainId: CHAIN_ID },
      { address: ADDRESSES.vault, abi: vaultAbi, functionName: 'deployedUsdc', chainId: CHAIN_ID },
      {
        address: ADDRESSES.vault,
        abi: vaultAbi,
        functionName: 'convertToAssets',
        args: [10n ** BigInt(decimals ?? 12)],
        chainId: CHAIN_ID,
      },
    ],
    query: { refetchInterval: 10_000, enabled: decimals !== undefined },
  })

  const total = data?.[0]?.result
  const idle = data?.[1]?.result
  const deployed = data?.[2]?.result
  const sharePrice = data?.[3]?.result

  const rows: { label: string; value: string; note: string }[] = [
    { label: 'Total assets', value: usdc(total, 2), note: 'Idle USDC plus claims at cost' },
    { label: 'Idle USDC', value: usdc(idle, 2), note: 'Available to pay sellers and LP withdrawals' },
    { label: 'Deployed in claims', value: usdc(deployed, 2), note: 'Paid out for claims not yet settled' },
  ]

  return (
    <section className="card rounded-3xl p-5" aria-labelledby="vault-heading">
      <div className="flex items-center justify-between">
        <h2 id="vault-heading" className="label">
          Vault
        </h2>
        <a
          href={buildAddressExplorerUrl(CHAIN_ID, ADDRESSES.vault)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--accent)' }}
        >
          Contract <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="mt-4">
        <span className="label">Share price</span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {isError ? 'Unavailable' : usdc(sharePrice, 6)}
          </span>
          <span className="text-sm" style={{ color: 'var(--subtle)' }}>
            USDC per share
          </span>
        </div>
      </div>

      <dl className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="inner rounded-2xl px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {r.label}
              </dt>
              <dd className="display text-xl font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                {isError ? 'Unavailable' : isLoading ? '...' : r.value}
                <span className="ml-1 text-xs font-normal" style={{ color: 'var(--subtle)' }}>
                  USDC
                </span>
              </dd>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--subtle)' }}>
              {r.note}
            </p>
          </div>
        ))}
      </dl>
    </section>
  )
}
