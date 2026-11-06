/**
 * Eight more FundToken stand-ins for Earlyout on Arc Testnet, deployed from the same
 * Circle developer-controlled wallet as the first deploy (read from its state file,
 * never modified). Same helpers as scripts/deploy-earlyout.ts; progress is kept in
 * contracts/deployments/.earlyout-funds-state.json so a re-run resumes.
 *
 *   bun run scripts/deploy-earlyout-funds.ts deploy   deploy, configure, hand over, write JSON
 *   bun run scripts/deploy-earlyout-funds.ts verify   read everything back from the chain
 *
 * FundRegistry and NavOracle are not touched: the ops wallet lists the funds.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { initiateSmartContractPlatformClient, type Blockchain as ScpBlockchain } from '@circle-fin/smart-contract-platform';
import { createPublicClient, encodeFunctionData, getAddress, http, type Abi, type Address, type Hex } from 'viem';
import { requireChain } from '../src/onchain-facts';
import { waitForSuccessfulTransaction } from '../src/onchain-wait';

const CHAIN = 'ARC-TESTNET';
const CHAIN_ID = 5042002;
const ROOT = '/home/user/app';
const OUT_DIR = `${ROOT}/contracts/deployments`;
const FIRST_STATE_PATH = `${OUT_DIR}/.earlyout-state.json`; // read only
const STATE_PATH = `${OUT_DIR}/.earlyout-funds-state.json`;
const JSON_PATH = `${OUT_DIR}/arc-testnet-funds.json`;

const OWNER = getAddress('0xbc832e4FC6a9CBd9c35884Bc744e6499cBFf537B'); // demo holder and new owner
const CLAIM_WRAPPER = getAddress('0xfc7E6ECF94e88E050c73733aC3cf03f831115952');
const ISSUER_STUB = getAddress('0x2b492aD36D8BB7BA6341a06AF76f1614A9516Ebe');
const ALLOWLIST = [OWNER, CLAIM_WRAPPER, ISSUER_STUB] as const;
const MINT = 1_000_000_000_000_000_000n;

const FUNDS = [
  { symbol: 'JAAA', name: 'Janus Henderson Anemoy AAA CLO Fund (stand-in)' },
  { symbol: 'JTRSY', name: 'Janus Henderson Anemoy Treasury Fund (stand-in)' },
  { symbol: 'USTB', name: 'Superstate Short Duration US Government Securities Fund (stand-in)' },
  { symbol: 'USCC', name: 'Superstate Crypto Carry Fund (stand-in)' },
  { symbol: 'USTBL', name: 'Spiko US T-Bills Money Market Fund (stand-in)' },
  { symbol: 'SAFO', name: 'Spiko Amundi Overnight Swap Fund (stand-in)' },
  { symbol: 'CASH+', name: 'Asseto CASH+ Money Market Fund (stand-in)' },
  { symbol: 'Treasury+', name: 'EPOCH Treasury+ Fund (stand-in)' },
] as const;

const chain = requireChain(CHAIN_ID);
const explorer = chain.explorerBase;

interface Step {
  txId?: string;
  txHash?: string;
  block?: number;
}
interface State {
  walletId?: string;
  walletAddress?: string;
  contracts: Record<string, { address: string; txHash?: string; contractId: string }>;
  steps: Record<string, Step>;
}

function loadState(): State {
  if (fs.existsSync(STATE_PATH)) return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as State;
  const first = JSON.parse(fs.readFileSync(FIRST_STATE_PATH, 'utf8')) as State;
  return { walletId: first.walletId, walletAddress: first.walletAddress, contracts: {}, steps: {} };
}
function saveState(s: State): void {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(s, null, 2)}\n`);
}

function idemKey(state: State, label: string): string {
  const h = crypto.createHash('sha256').update(`earlyout-funds:${state.walletId}:${label}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const art = (() => {
  const j = JSON.parse(fs.readFileSync(`${ROOT}/contracts/out/FundToken.sol/FundToken.json`, 'utf8')) as {
    abi: Abi;
    bytecode: { object: Hex };
  };
  return { abi: j.abi, bytecode: j.bytecode.object };
})();

const wallets = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});
const scp = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});
const pub = createPublicClient({ transport: http(chain.rpcUrls[0]) });

async function deployFund(state: State, symbol: string, name: string): Promise<Address> {
  const done = state.contracts[symbol];
  if (done) {
    console.log(`= ${symbol} already deployed at ${done.address}`);
    return done.address as Address;
  }
  const safe = symbol.replace('+', 'Plus');
  const res = await scp.deployContract({
    name: `EarlyoutFund${safe}`,
    blockchain: CHAIN,
    walletId: state.walletId!,
    abiJson: JSON.stringify(art.abi),
    bytecode: art.bytecode,
    constructorParameters: [name, symbol] as never,
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    idempotencyKey: idemKey(state, `deploy:${symbol}`),
  });
  const contractId = res.data?.contractId;
  if (!contractId) throw new Error(`No contract id for ${symbol}`);
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const c = (await scp.getContract({ id: contractId })).data?.contract;
    if (c?.status === 'FAILED') throw new Error(`${symbol} deploy failed: ${c.deploymentErrorReason ?? ''} ${c.deploymentErrorDetails ?? ''}`);
    if (c?.status === 'COMPLETE' && c.contractAddress) {
      const address = getAddress(c.contractAddress);
      state.contracts[symbol] = { address, txHash: c.txHash, contractId };
      saveState(state);
      console.log(`+ ${symbol} deployed at ${address} tx ${c.txHash}`);
      return address;
    }
  }
  throw new Error(`${symbol} deploy timed out (contract ${contractId}); re-run to resume.`);
}

async function call(state: State, label: string, to: Address, fn: string, args: unknown[]): Promise<void> {
  if (state.steps[label]?.txHash) {
    console.log(`= ${label} already done`);
    return;
  }
  const callData = encodeFunctionData({ abi: art.abi, functionName: fn, args });
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

async function deploy(): Promise<void> {
  const state = loadState();
  if (!state.walletId || !state.walletAddress) throw new Error('First deploy state has no wallet.');
  console.log(`Deployer ${state.walletAddress}`);

  const addresses: Record<string, Address> = {};
  for (const f of FUNDS) addresses[f.symbol] = await deployFund(state, f.symbol, f.name);

  for (const f of FUNDS) {
    const token = addresses[f.symbol];
    for (const who of ALLOWLIST) await call(state, `${f.symbol}.setAllowlisted(${who})`, token, 'setAllowlisted', [who, true]);
    await call(state, `${f.symbol}.mint`, token, 'mint', [OWNER, MINT]);
    await call(state, `${f.symbol}.transferOwnership`, token, 'transferOwnership', [OWNER]);
  }

  const lastBlock = Math.max(...Object.values(state.steps).map((s) => s.block ?? 0));
  const out = {
    chainId: CHAIN_ID,
    block: lastBlock,
    funds: FUNDS.map((f) => ({
      symbol: f.symbol,
      name: f.name,
      address: addresses[f.symbol],
      deployTx: state.contracts[f.symbol].txHash,
    })),
  };
  fs.writeFileSync(JSON_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${JSON_PATH}`);
}

async function verify(): Promise<void> {
  const state = loadState();
  const out = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) as { funds: { symbol: string; address: Address; deployTx: string }[] };
  const usdc = chain.usdc!.address as Address;
  let allOk = true;
  for (const f of out.funds) {
    const read = (fn: string, args: unknown[] = []) =>
      pub.readContract({ address: f.address, abi: art.abi, functionName: fn, args });
    const [name, symbol, owner, bal, ...allowed] = await Promise.all([
      read('name'),
      read('symbol'),
      read('owner'),
      read('balanceOf', [OWNER]),
      ...ALLOWLIST.map((a) => read('allowlisted', [a])),
    ]);
    const ok =
      owner === OWNER && bal === MINT && allowed.every((x) => x === true) && symbol === f.symbol && typeof name === 'string';
    allOk &&= ok;
    console.log(
      JSON.stringify({
        symbol,
        address: f.address,
        addressLink: `${explorer}/address/${f.address}`,
        deployTx: f.deployTx,
        txLink: `${explorer}/tx/${f.deployTx}`,
        name,
        owner,
        balance: String(bal),
        allowlisted: allowed,
        ok,
      }),
    );
  }
  const balance = await pub.readContract({
    address: usdc,
    abi: [{ type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: [state.walletAddress as Address],
  });
  console.log(`deployer ${state.walletAddress} remaining USDC (6dp raw): ${balance}`);
  console.log(`ALL_OK=${allOk}`);
}

const cmd = process.argv[2];
(cmd === 'deploy' ? deploy() : cmd === 'verify' ? verify() : Promise.reject(new Error('usage: deploy | verify'))).catch(
  (e: unknown) => {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error(msg.replace(/\b[A-Za-z0-9+/=_-]{40,}\b/g, '[redacted]').slice(0, 800));
    process.exit(1);
  },
);
