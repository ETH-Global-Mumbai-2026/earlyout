import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { publicError, serverEnv } from "@/server/env";
import { allow } from "@/server/limit";
import { readHoldings } from "@/server/state";
import { toWire } from "@/lib/wire";

export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

/// GET /api/holdings?address=0x...: the claims a wallet holds, from the claims it
/// bought (Arc ClaimBought logs), with balances and payout state read on chain.
export async function GET(req: Request) {
  if (!allow(req, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: noStore });
  const address = new URL(req.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) return NextResponse.json({ error: "address must be an EVM address" }, { status: 400, headers: noStore });
  if (serverEnv.mode === "mock") return new NextResponse(toWire([]), { headers: { "content-type": "application/json", ...noStore } });
  try {
    const { claimsBoughtBy } = await import("@/server/holdings");
    const holdings = await readHoldings(address as Address, await claimsBoughtBy(address as Address));
    return new NextResponse(toWire(holdings), { headers: { "content-type": "application/json", ...noStore } });
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Read failed") }, { status: 502, headers: noStore });
  }
}
