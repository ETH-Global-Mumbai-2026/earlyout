import { useState } from 'react'
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ExternalLink, Loader2 } from 'lucide-react'
import { buildTxExplorerUrl } from '@/onchain-facts'
import {
  ADDRESSES,
  CHAIN_ID,
  claimTokenAbi,
  fundTokenAbi,
  parseOnchainError,
  units18,
  usdc,
  wrapperAbi,
  type FundInfo,
} from '../lib/earlyout'
import type { QuoteData } from './QuotePanel'

interface Props {
  fund: FundInfo
  amount: bigint
  quote: QuoteData | undefined
  onSold: () => void
}

type Step = 'idle' | 'approving' | 'selling'

const MIN_PAYOUT_BPS = 9950n

export function SellButton({ fund, amount, quote, onSold }: Props) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string>()
  const [approveHash, setApproveHash] = useState<`0x${string}`>()
  const [sellHash, setSellHash] = useState<`0x${string}`>()
  const [soldPayout, setSoldPayout] = useState<bigint>()

  const enabled = Boolean(address)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: fund.address,
    abi: fundTokenAbi,
    functionName: 'allowance',
    args: address ? [address, ADDRESSES.wrapper] : undefined,
    chainId: CHAIN_ID,
    query: { enabled },
  })
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: fund.address,
    abi: fundTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled },
  })
  const { data: fundAllowed } = useReadContract({
    address: fund.address,
    abi: fundTokenAbi,
    functionName: 'allowlisted',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled },
  })
  const { data: claimAllowed } = useReadContract({
    address: ADDRESSES.claims,
    abi: claimTokenAbi,
    functionName: 'allowlisted',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled },
  })

  const wrongChain = isConnected && chainId !== CHAIN_ID
  const busy = step !== 'idle'
  const buyable = quote?.verdict === 0 && quote.payout > 0n
  const needsApproval = allowance !== undefined && allowance < amount
  const insufficient = balance !== undefined && amount > balance
  const notEligible = fundAllowed === false || claimAllowed === false

  async function onSell() {
    if (!address || !publicClient || !quote) return
    setError(undefined)
    setSoldPayout(undefined)
    setSellHash(undefined)
    try {
      if (needsApproval) {
        setStep('approving')
        const hash = await writeContractAsync({
          address: fund.address,
          abi: fundTokenAbi,
          functionName: 'approve',
          args: [ADDRESSES.wrapper, amount],
          chainId: CHAIN_ID,
        })
        setApproveHash(hash)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('reverted')
        await refetchAllowance()
      }
      setStep('selling')
      const minPayout = (quote.payout * MIN_PAYOUT_BPS) / 10_000n
      const hash = await writeContractAsync({
        address: ADDRESSES.wrapper,
        abi: wrapperAbi,
        functionName: 'depositAndSell',
        args: [fund.address, amount, minPayout],
        chainId: CHAIN_ID,
      })
      setSellHash(hash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('reverted')
      setSoldPayout(quote.payout)
      void refetchBalance()
      onSold()
    } catch (e) {
      const message = parseOnchainError(e)
      if (message !== 'Transaction cancelled.') setError(message)
    } finally {
      setStep('idle')
    }
  }

  const spinner = <Loader2 className="size-4 animate-spin" />
  const ctaStyle = { background: 'var(--accent)', color: '#0d1b2f' }
  const ctaClass =
    'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40'

  let cta: React.ReactNode
  if (!isConnected) {
    cta = (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button type="button" onClick={show} className={ctaClass} style={ctaStyle}>
            Connect wallet to sell
          </button>
        )}
      </ConnectKitButton.Custom>
    )
  } else if (wrongChain) {
    cta = (
      <button type="button" disabled={switching} onClick={() => switchChain({ chainId: CHAIN_ID })} className={ctaClass} style={ctaStyle}>
        {switching ? spinner : null} Switch to Arc Testnet
      </button>
    )
  } else {
    const label = !quote
      ? 'Sell'
      : needsApproval
        ? `Allow ${fund.symbol}, then sell for ${usdc(quote.payout, 4)} USDC`
        : `Sell for ${usdc(quote.payout, 4)} USDC`
    cta = (
      <button
        type="button"
        disabled={busy || amount === 0n || !buyable || insufficient || notEligible}
        onClick={() => void onSell()}
        className={ctaClass}
        style={ctaStyle}
      >
        {step === 'approving' ? (
          <>
            {spinner} Allowing {fund.symbol}...
          </>
        ) : step === 'selling' ? (
          <>
            {spinner} Selling...
          </>
        ) : (
          label
        )}
      </button>
    )
  }

  let hint: string | undefined
  if (isConnected && !wrongChain) {
    if (notEligible) hint = 'This wallet is not on the allowlist for this fund. Only approved wallets can sell here.'
    else if (insufficient) hint = `You hold ${units18(balance, 4)} ${fund.symbol}, less than the amount entered.`
    else if (amount > 0n && quote && !buyable) hint = 'The vault is not buying this amount right now.'
  }

  return (
    <div className="space-y-3">
      {cta}
      {quote && isConnected ? (
        <p className="text-center text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
          Minimum payout {usdc((quote.payout * MIN_PAYOUT_BPS) / 10_000n, 6)} USDC (99.5% of the quote)
        </p>
      ) : null}
      {hint ? (
        <p className="text-center text-xs" style={{ color: 'var(--danger)' }}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-center text-sm" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
      {approveHash ? <TxLink label="Allowance transaction" hash={approveHash} /> : null}
      {sellHash ? (
        <div className="inner rounded-2xl p-4">
          <div className="text-sm font-semibold" style={{ color: soldPayout !== undefined ? 'var(--success)' : 'var(--ink)' }}>
            {soldPayout !== undefined ? 'Sold. USDC sent to your wallet.' : 'Waiting for confirmation...'}
          </div>
          <TxLink label="Sale transaction" hash={sellHash} />
        </div>
      ) : null}
    </div>
  )
}

function TxLink({ label, hash }: { label: string; hash: `0x${string}` }) {
  return (
    <a
      href={buildTxExplorerUrl(CHAIN_ID, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-center justify-center gap-1 text-xs"
      style={{ color: 'var(--accent)' }}
    >
      {label}: <span className="mono">{hash.slice(0, 10)}...{hash.slice(-6)}</span> <ExternalLink className="size-3" />
    </a>
  )
}
