import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { AmountInput } from './components/AmountInput'
import { FundPicker } from './components/FundPicker'
import { QuotePanel, type QuoteData } from './components/QuotePanel'
import { SellButton } from './components/SellButton'
import { VaultPanel } from './components/VaultPanel'
import { ADDRESSES, CHAIN_ID, FUNDS, fundTokenAbi, units18, vaultAbi } from './lib/earlyout'
import { parseUnitsExact } from '@/onchain-money'

function parseAmount(text: string): bigint {
  if (text === '' || text === '.') return 0n
  try {
    return parseUnitsExact(text, 18)
  } catch {
    return 0n
  }
}

export default function App() {
  const [fundIndex, setFundIndex] = useState(1)
  const [amountText, setAmountText] = useState('0.001')
  const fund = FUNDS[fundIndex]
  const amount = parseAmount(amountText)

  const { address } = useAccount()

  const {
    data: quoteData,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address: ADDRESSES.vault,
    abi: vaultAbi,
    functionName: 'quoteFund',
    args: [fund.address, amount],
    chainId: CHAIN_ID,
    query: { enabled: amount > 0n, refetchInterval: 8_000 },
  })
  const quote = amount > 0n ? (quoteData) : undefined

  const { data: balance } = useReadContract({
    address: fund.address,
    abi: fundTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) },
  })

  return (
    <div className="min-h-dvh px-4 pb-24 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>
              Earlyout
            </h1>
            <p className="text-sm text-pretty" style={{ color: 'var(--subtle)' }}>
              Sell a pending fund redemption today, at a price that names its own risks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="label hidden sm:inline">Arc Testnet</span>
            <ConnectKitButton />
          </div>
        </header>

        <main className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="card space-y-4 rounded-3xl p-5" aria-labelledby="sell-heading">
            <h2 id="sell-heading" className="label">
              Sell a claim
            </h2>
            <FundPicker selected={fundIndex} onSelect={setFundIndex} />
            <AmountInput
              value={amountText}
              symbol={fund.symbol}
              onChange={setAmountText}
              balanceLabel={balance === undefined ? undefined : `Balance ${units18(balance, 4)}`}
              onMax={balance === undefined ? undefined : () => setAmountText(units18(balance, 18).replace(/\.?0+$/, '') || '0')}
            />
            <QuotePanel quote={quote} hasAmount={amount > 0n} isLoading={isLoading} isError={isError} />
            <SellButton fund={fund} amount={amount} quote={quote} onSold={() => void refetch()} />
          </section>

          <aside>
            <VaultPanel />
          </aside>
        </main>
      </div>
    </div>
  )
}
