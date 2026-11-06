/**
 * Earlyout deploy on Arc Testnet from a Circle developer-controlled EOA wallet.
 * Mirrors contracts/script/Deploy.s.sol step by step (same order, same values).
 *
 *   bun run scripts/deploy-earlyout.ts wallet     create (or load) the deployer wallet
 *   bun run scripts/deploy-earlyout.ts deploy     deploy, configure, hand over (resumable)
 *
 * Progress is kept in contracts/deployments/.earlyout-state.json so a re-run resumes
 * and never repeats a finished step. No secrets are written there.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  initiateDeveloperControlledWalletsClient,
  type Blockchain,
} from '@circle-fin/developer-controlled-wallets';
import { initiateSmartContractPlatformClient, type Blockchain as ScpBlockchain } from '@circle-fin/smart-contract-platform';
import { createPublicClient, encodeFunctionData, getAddress, http, type Abi, type Address, type Hex } from 'viem';
import { requireChain } from '../src/onchain-facts';
import { waitForSuccessfulTransaction } from '../src/onchain-wait';

const CHAIN = 'ARC-TESTNET';
const CHAIN_ID = 5042002;
const ROOT = '/home/user/app';
const OUT_DIR = `${ROOT}/contracts/deployments`;
const STATE_PATH = `${OUT_DIR}/.earlyout-state.json`;
const JSON_PATH = `${OUT_DIR}/arc-testnet.json`;

// Agreed values (same as the Deploy.s.sol environment).
const NEW_OWNER = getAddress('0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B');
const DEMO_HOLDER = NEW_OWNER;
const CAP = 20n * 1_000_000n; // EXPOSURE_CAP_USDC=20
const NAV_8DP = 111377320000n; // INITIAL_NAV_8DP
const NAV_UPDATED_AT = 1793916047n; // INITIAL_NAV_UPDATED_AT
// VAULT_SEED_USDC=0 and ISSUER_FUND_USDC=0: no funding steps.

const chain = requireChain(CHAIN_ID);
const USDC = getAddress(chain.usdc!.address);
const explorer = chain.explorerBase;

interface Step {
  txId?: string;
  txHash?: string;
  block?: number;
}
interface State {
  walletSetId?: string;
  walletId?: string;
  walletAddress?: string;
  contracts: Record<string, { address: string; txHash?: string; contractId: string }>;
  steps: Record<string, Step>;
}

function loadState(): State {
  if (fs.existsSync(STATE_PATH)) return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as State;
  return { contracts: {}, steps: {} };
}
function saveState(s: State): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(s, null, 2)}\n`);
}

function idemKey(state: State, label: string): string {
  const h = crypto.createHash('sha256').update(`earlyout:${state.walletId}:${label}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function artifact(name: string): { abi: Abi; bytecode: Hex } {
  const j = JSON.parse(fs.readFileSync(`${ROOT}/contracts/out/${name}.sol/${name}.json`, 'utf8')) as {
    abi: Abi;
    bytecode: { object: Hex };
  };
  return { abi: j.abi, bytecode: j.bytecode.object };
}

const apiKey = process.env.CIRCLE_API_KEY!;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;
const wallets = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
const scp = initiateSmartContractPlatformClient({ apiKey, entitySecret });
const pub = createPublicClient({ transport: http(chain.rpcUrls[0]) });

async function createWallet(): Promise<void> {
  const state = loadState();
  if (state.walletId) {
    console.log(JSON.stringify({ walletId: state.walletId, walletAddress: state.walletAddress, reused: true }, null, 2));
    return;
  }
  const set = await wallets.createWalletSet({ name: `earlyout-deployer-${Date.now()}` });
  const walletSetId = set.data?.walletSet?.id;
  if (!walletSetId) throw new Error('No wallet set id returned.');
  const w = await wallets.createWallets({ accountType: 'EOA', blockchains: [CHAIN], count: 1, walletSetId });
  const wallet = w.data?.wallets?.[0];
  if (!wallet?.id || !wallet.address) throw new Error('No wallet returned.');
  state.walletSetId = walletSetId;
  state.walletId = wallet.id;
  state.walletAddress = getAddress(wallet.address);
  saveState(state);
  console.log(JSON.stringify({ walletSetId, walletId: wallet.id, walletAddress: state.walletAddress }, null, 2));
}

async function deployContract(state: State, label: string, name: string, args: unknown[]): Promise<Address> {
  const done = state.contracts[label];
  if (done) {
    console.log(`= ${label} already deployed at ${done.address}`);
    return done.address as Address;
  }
  const art = artifact(name);
  const res = await scp.deployContract({
    name: `Earlyout${label}`,
    blockchain: CHAIN,
    walletId: state.walletId!,
    abiJson: JSON.stringify(art.abi),
    bytecode: art.bytecode,
    constructorParameters: args as never,
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    idempotencyKey: idemKey(state, `deploy:${label}`),
  });
  const contractId = res.data?.contractId;
  if (!contractId) throw new Error(`No contract id for ${label}`);
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const c = (await scp.getContract({ id: contractId })).data?.contract;
    if (c?.status === 'FAILED') throw new Error(`${label} deploy failed: ${c.deploymentErrorReason ?? ''} ${c.deploymentErrorDetails ?? ''}`);
    if (c?.status === 'COMPLETE' && c.contractAddress) {
      const address = getAddress(c.contractAddress);
      state.contracts[label] = { address, txHash: c.txHash, contractId };
      saveState(state);
      console.log(`+ ${label} deployed at ${address} tx ${c.txHash}`);
      return address;
    }
  }
  throw new Error(`${label} deploy timed out (contract ${contractId}); re-run to resume.`);
}

async function call(state: State, label: string, to: Address, name: string, fn: string, args: unknown[]): Promise<void> {
  if (state.steps[label]?.txHash) {
    console.log(`= ${label} already done`);
    return;
  }
  const callData = encodeFunctionData({ abi: artifact(name).abi, functionName: fn, args });
  const res = await wallets.createContractExecutionTransaction({
    walletId: state.walletId!,
    contractAddress: to,
    callData,
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    idempotencyKey: idemKey(state, `call:${label}`),
  });
  const id = res.data?.id;
  if (!id) throw new Error(`No transaction id for ${label}`);
  const tx = await waitForSuccessfulTransaction(
    async () => (await wallets.getTransaction({ id })).data?.transaction,
    (t) => t?.state,
    { label, timeoutMs: 240_000 },
  );
  const txHash = tx?.txHash;
  if (!txHash) throw new Error(`No tx hash for ${label}`);
  const receipt = await pub.getTransactionReceipt({ hash: txHash as Hex }).catch(() => undefined);
  if (receipt && receipt.status !== 'success') throw new Error(`${label} reverted onchain: ${txHash}`);
  state.steps[label] = { txId: id, txHash, block: receipt ? Number(receipt.blockNumber) : undefined };
  saveState(state);
  console.log(`+ ${label} tx ${txHash}`);
}

function terms(symbol: string, delay: bigint, window: bigint) {
  return {
    listed: true,
    settlementDelay: delay,
    window,
    maxAge: 96n * 3600n,
    volBps: 800,
    creditBps: 150,
    recoveryBps: 4000,
    exposureCapUsdc: CAP,
    symbol,
  };
}

async function deploy(): Promise<void> {
  const state = loadState();
  if (!state.walletId || !state.walletAddress) throw new Error('Run the wallet command first.');
  const deployer = state.walletAddress as Address;
  console.log(`Deployer ${deployer}`);

  // _deploy
  const registry = await deployContract(state, 'FundRegistry', 'FundRegistry', [50, 300]);
  const oracle = await deployContract(state, 'NavOracle', 'NavOracle', [deployer]);
  const issuer = await deployContract(state, 'IssuerStub', 'IssuerStub', [USDC, registry, oracle]);
  const claims = await deployContract(state, 'ClaimToken', 'ClaimToken', []);
  const wrapper = await deployContract(state, 'ClaimWrapper', 'ClaimWrapper', [USDC, registry, issuer, claims]);
  const vault = await deployContract(state, 'Vault', 'Vault', [USDC, registry, oracle, claims, wrapper]);
  await call(state, 'claims.setWrapper', claims, 'ClaimToken', 'setWrapper', [wrapper]);
  await call(state, 'wrapper.setVault', wrapper, 'ClaimWrapper', 'setVault', [vault]);
  const fundA = await deployContract(state, 'FundA_ACRED', 'FundToken', ['Apollo Diversified Credit (stand-in)', 'ACRED']);
  const fundB = await deployContract(state, 'FundB_ACREDd', 'FundToken', ['ACRED demo window', 'ACREDd']);

  // _configure
  await call(state, 'registry.listFund(A)', registry, 'FundRegistry', 'listFund', [fundA, terms('ACRED', 90n * 86400n, 86400n)]);
  await call(state, 'registry.listFund(B)', registry, 'FundRegistry', 'listFund', [fundB, terms('ACREDd', 900n, 300n)]);
  for (const who of [DEMO_HOLDER, wrapper, issuer]) {
    await call(state, `fundA.setAllowlisted(${who})`, fundA, 'FundToken', 'setAllowlisted', [who, true]);
    await call(state, `fundB.setAllowlisted(${who})`, fundB, 'FundToken', 'setAllowlisted', [who, true]);
  }
  for (const who of [DEMO_HOLDER, wrapper, vault]) {
    await call(state, `claims.setAllowlisted(${who})`, claims, 'ClaimToken', 'setAllowlisted', [who, true]);
  }
  await call(state, 'fundA.mint', fundA, 'FundToken', 'mint', [DEMO_HOLDER, 10n ** 18n]);
  await call(state, 'fundB.mint', fundB, 'FundToken', 'mint', [DEMO_HOLDER, 10n ** 18n]);
  for (const [tag, fund] of [['A', fundA], ['B', fundB]] as const) {
    const { encodeAbiParameters, parseAbiParameters } = await import('viem');
    const report = encodeAbiParameters(parseAbiParameters('address, uint256, uint8, uint64, uint8'), [fund, NAV_8DP, 8, NAV_UPDATED_AT, 0]);
    await call(state, `oracle.onReport(${tag})`, oracle, 'NavOracle', 'onReport', ['0x', report]);
  }

  // _fund: VAULT_SEED_USDC=0 and ISSUER_FUND_USDC=0, nothing to do.

  // _handOver
  await call(state, 'oracle.setForwarder', oracle, 'NavOracle', 'setForwarder', [NEW_OWNER]);
  const ownables: [string, Address, string][] = [
    ['registry', registry, 'FundRegistry'],
    ['oracle', oracle, 'NavOracle'],
    ['issuer', issuer, 'IssuerStub'],
    ['claims', claims, 'ClaimToken'],
    ['wrapper', wrapper, 'ClaimWrapper'],
    ['vault', vault, 'Vault'],
    ['fundA', fundA, 'FundToken'],
    ['fundB', fundB, 'FundToken'],
  ];
  for (const [tag, addr, name] of ownables) {
    await call(state, `${tag}.transferOwnership`, addr, name, 'transferOwnership', [NEW_OWNER]);
  }

  // _write (same shape as the script). "block" = block of the last transaction.
  const lastBlock = Math.max(...Object.values(state.steps).map((s) => s.block ?? 0));
  const out = {
    chainId: CHAIN_ID,
    block: lastBlock,
    FundRegistry: registry,
    NavOracle: oracle,
    IssuerStub: issuer,
    ClaimToken: claims,
    ClaimWrapper: wrapper,
    Vault: vault,
    FundA_ACRED: fundA,
    FundB_ACREDd: fundB,
    owner: NEW_OWNER,
    deployer,
  };
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${JSON_PATH}`);
  console.log(`Explorer base ${explorer}`);
}

const cmd = process.argv[2];
(cmd === 'wallet' ? createWallet() : cmd === 'deploy' ? deploy() : Promise.reject(new Error('usage: wallet | deploy'))).catch(
  (e: unknown) => {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error(msg.replace(/\b[A-Za-z0-9+/=_-]{40,}\b/g, '[redacted]').slice(0, 800));
    process.exit(1);
  },
);
