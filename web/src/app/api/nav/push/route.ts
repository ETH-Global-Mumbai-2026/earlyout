import { NextResponse } from "next/server";
import { parseUnits } from "viem";
import { issuerAbi } from "@/lib/abi";
import { cronAuthorized, demoAuthorized, publicError, serverEnv } from "@/server/env";
import { allow } from "@/server/limit";

const OPS_RESERVE = parseUnits("2", 18); // never spend the ops wallet below this (native USDC, 18dp)

/// POST or GET /api/nav/push: carry the mainnet NAV feed and issuer status to NavOracle on Arc.
/// Stand-in for the CRE workflow; refuses to run once CRE owns the forwarder.
/// It signs on chain, so it fails closed: the Vercel cron bearer or the demo key, nothing else.
async function run(req: Request) {
  if (!allow(req, 6)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (serverEnv.mode === "mock") return NextResponse.json({ mode: "mock", results: [] });
  if (!cronAuthorized(req) && !demoAuthorized(req)) {
    return NextResponse.json({ error: "Demo key required" }, { status: 401 });
  }
  try {
    const { arcPublic, opsWallet } = await import("@/server/arc");
    const { pushNav } = await import("@/server/nav");
    if (!serverEnv.issuer) throw new Error("NEXT_PUBLIC_ISSUER_STUB is not set");
    const wallet = opsWallet();
    if (wallet && (await arcPublic.getBalance({ address: wallet.account.address })) < OPS_RESERVE) {
      return NextResponse.json({ error: "Ops wallet is below its reserve" }, { status: 503 });
    }
    const failed = await arcPublic.readContract({ address: serverEnv.issuer, abi: issuerAbi, functionName: "failed" });
    return NextResponse.json(await pushNav(failed));
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Could not push NAV") }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
