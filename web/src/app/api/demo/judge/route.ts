import { NextResponse } from "next/server";
import { isAddress, parseUnits, type Address } from "viem";
import { claimTokenAbi, fundTokenAbi, registryAbi } from "@/lib/abi";
import { serverEnv } from "@/server/env";

const DEMO_UNITS = parseUnits("0.05", 18); // about 55 USDC of ACRED at NAV
const GAS_USDC = parseUnits("0.2", 18); // native balance on Arc is 18dp
const OPS_RESERVE = parseUnits("2", 18); // never spend the ops wallet below this
const MAX_PER_HOUR = 20; // fresh wallets per server instance per hour
const ARC_TESTNET = 5042002;

const recent: number[] = [];
function overRate() {
  const cutoff = Date.now() - 3_600_000;
  while (recent.length && recent[0] < cutoff) recent.shift();
  if (recent.length >= MAX_PER_HOUR) return true;
  recent.push(Date.now());
  return false;
}

/// POST {"address":"0x..."}: lets a visitor try the Sell flow with a wallet they control.
/// Allowlists them on every fund token and on ClaimToken, mints demo units, sends gas.
/// Open by design so judges need no key, with three limits: Arc testnet only,
/// MAX_PER_HOUR fresh wallets per instance, and the ops wallet keeps OPS_RESERVE.
/// Set DEMO_TOKEN to require a key instead.
export async function POST(req: Request) {
  if (serverEnv.demoToken && req.headers.get("x-demo-token") !== serverEnv.demoToken) {
    return NextResponse.json({ error: "Demo key required" }, { status: 401 });
  }
  let body: { address?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (typeof body.address !== "string" || !isAddress(body.address)) {
    return NextResponse.json({ error: "address must be an EVM address" }, { status: 400 });
  }
  const visitor = body.address as Address;
  if (serverEnv.mode === "mock") return NextResponse.json({ ok: true, mode: "mock" });

  const { opsWallet, arcPublic } = await import("@/server/arc");
  const wallet = opsWallet();
  const registry = process.env.NEXT_PUBLIC_FUND_REGISTRY as Address | undefined;
  const claims = process.env.NEXT_PUBLIC_CLAIM_TOKEN as Address | undefined;
  if (!wallet || !registry || !claims) return NextResponse.json({ error: "Server has no ops wallet or addresses configured" }, { status: 503 });

  try {
    const chainId = await arcPublic.getChainId();
    if (chainId !== ARC_TESTNET) return NextResponse.json({ error: "Demo setup only runs on Arc testnet" }, { status: 403 });
    const opsBalance = await arcPublic.getBalance({ address: wallet.account.address });
    if (opsBalance < OPS_RESERVE + GAS_USDC) return NextResponse.json({ error: "Demo wallet is out of test USDC. Ask the team." }, { status: 503 });
    if (overRate()) return NextResponse.json({ error: "Too many demo setups this hour. Try again later." }, { status: 429 });
    const funds = await arcPublic.readContract({ address: registry, abi: registryAbi, functionName: "funds" });
    const hashes: string[] = [];
    const wait = async (hash: `0x${string}`) => {
      const r = await arcPublic.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error(`Transaction ${hash} reverted`);
      hashes.push(hash);
    };
    for (const fund of funds) {
      const [allowed, balance] = await Promise.all([
        arcPublic.readContract({ address: fund, abi: fundTokenAbi, functionName: "allowlisted", args: [visitor] }),
        arcPublic.readContract({ address: fund, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }], functionName: "balanceOf", args: [visitor] }),
      ]);
      if (!allowed) await wait(await wallet.writeContract({ address: fund, abi: fundTokenAbi, functionName: "setAllowlisted", args: [visitor, true] }));
      if (balance < DEMO_UNITS) await wait(await wallet.writeContract({ address: fund, abi: fundTokenAbi, functionName: "mint", args: [visitor, DEMO_UNITS] }));
    }
    const claimAllowed = await arcPublic.readContract({ address: claims, abi: claimTokenAbi, functionName: "allowlisted", args: [visitor] });
    if (!claimAllowed) await wait(await wallet.writeContract({ address: claims, abi: claimTokenAbi, functionName: "setAllowlisted", args: [visitor, true] }));
    const gas = await arcPublic.getBalance({ address: visitor });
    if (gas < GAS_USDC / 2n) await wait(await wallet.sendTransaction({ to: visitor, value: GAS_USDC }));
    return NextResponse.json({ ok: true, funds: funds.length, transactions: hashes });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
