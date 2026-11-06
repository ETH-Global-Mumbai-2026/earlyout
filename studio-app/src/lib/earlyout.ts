import { parseAbi } from 'viem'
import { arcTestnet } from 'viem/chains'
import deployments from '../../contracts/deployments/arc-testnet.json'
import { getUsdc } from '@/onchain-facts'
import { formatUnitsFixed } from '@/onchain-money'

export const CHAIN_ID = arcTestnet.id

const asAddress = (value: string) => value as `0x${string}`

/** Single source of truth: the deployment record written by the deploy. */
export const ADDRESSES = {
  vault: asAddress(deployments.Vault),
  wrapper: asAddress(deployments.ClaimWrapper),
  oracle: asAddress(deployments.NavOracle),
  registry: asAddress(deployments.FundRegistry),
  claims: asAddress(deployments.ClaimToken),
  usdc: asAddress(getUsdc(CHAIN_ID)?.address ?? ''),
} as const

export interface FundInfo {
  address: `0x${string}`
  symbol: string
  name: string
}

export const FUNDS: FundInfo[] = [
  { address: asAddress(deployments.FundA_ACRED), symbol: 'ACRED', name: 'Apollo Diversified Credit (stand-in)' },
  { address: asAddress(deployments.FundB_ACREDd), symbol: 'ACREDd', name: 'ACRED demo window' },
]

const quoteStruct =
  'struct Quote { uint8 verdict; string reason; uint256 nav; uint64 navUpdatedAt; uint16 baseBps; uint16 utilBps; uint16 timeBps; uint16 creditBps; uint256 payout; uint256 capacityLeft; }'
const termsStruct =
  'struct Terms { bool listed; uint64 settlementDelay; uint64 window; uint64 maxAge; uint16 volBps; uint16 creditBps; uint16 recoveryBps; uint256 exposureCapUsdc; string symbol; }'

export const oracleAbi = parseAbi([
  'function getNav(address fund) view returns (uint256 nav, uint64 updatedAt, uint8 status)',
])

export const registryAbi = parseAbi([termsStruct, 'function getTerms(address fund) view returns (Terms)'])

export const vaultAbi = parseAbi([
  quoteStruct,
  'function quoteFund(address fund, uint256 amount) view returns (Quote)',
  'function totalAssets() view returns (uint256)',
  'function deployedUsdc() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
])

export const wrapperAbi = parseAbi([
  'function depositAndSell(address fund, uint256 amount, uint256 minPayout) returns (uint256 claimId, uint256 payout)',
])

export const fundTokenAbi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowlisted(address) view returns (bool)',
])

export const claimTokenAbi = parseAbi(['function allowlisted(address) view returns (bool)'])

export const erc20BalanceAbi = parseAbi(['function balanceOf(address) view returns (uint256)'])

export const VERDICTS = [
  { label: 'BUY', tone: 'success', blurb: 'The vault will buy this claim now.' },
  { label: 'REFUSE', tone: 'danger', blurb: 'The vault will not buy this claim right now.' },
  { label: 'HALT', tone: 'danger', blurb: 'Trading in this fund is halted.' },
] as const

export function formatDuration(seconds: bigint | number): string {
  const s = Number(seconds)
  if (s % 86400 === 0) return `${s / 86400} day${s === 86400 ? '' : 's'}`
  if (s % 3600 === 0) return `${s / 3600} hour${s === 3600 ? '' : 's'}`
  if (s % 60 === 0) return `${s / 60} minutes`
  return `${s} seconds`
}

/** USDC amounts (6 decimals), grouped, with a fixed number of fraction digits. */
export function usdc(raw: bigint | undefined, fractionDigits = 2): string {
  if (raw === undefined) return '...'
  const fixed = formatUnitsFixed(raw, 6, fractionDigits)
  const [whole, frac] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

/** 18-decimal values such as NAV and fund units. */
export function units18(raw: bigint | undefined, fractionDigits = 4): string {
  if (raw === undefined) return '...'
  return formatUnitsFixed(raw, 18, fractionDigits)
}

export function pct(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`
}

export function parseOnchainError(error: unknown): string {
  const e = error as { message?: string; shortMessage?: string; code?: number } | undefined
  const message = `${e?.shortMessage ?? ''} ${e?.message ?? ''}`.toLowerCase()
  if (e?.code === 4001 || message.includes('user rejected') || message.includes('user denied')) return 'Transaction cancelled.'
  if (message.includes('notallowlisted') || message.includes('not allowlisted')) return 'This wallet is not on the allowlist for this fund or its claims.'
  if (message.includes('notbuyable')) return 'The vault refused the sale. Check the quote above.'
  if (message.includes('belowminpayout')) return 'The price moved below your minimum payout. Quote refreshed, try again.'
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) return 'Insufficient balance for this transaction or its gas.'
  if (message.includes('insufficientbalance') || message.includes('erc20insufficientbalance')) return 'You do not hold that many fund units.'
  if (message.includes('reverted')) return 'The transaction would fail onchain. Check the quote and your balances.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Check your connection and try again.'
  return 'Something went wrong. Please try again.'
}
