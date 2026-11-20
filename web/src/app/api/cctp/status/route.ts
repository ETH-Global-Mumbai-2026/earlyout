import { NextResponse } from "next/server";
import { allow } from "@/server/limit";
import { CCTP_CHAINS, IRIS_SANDBOX, forwardStatus, type CctpChainKey } from "@/lib/cctp";

export const dynamic = "force-dynamic";

/// GET /api/cctp/status?from=arc&tx=0x..: whether Circle has minted the
/// forwarded USDC on the destination chain, and the transaction that did it.
export async function GET(req: Request) {
  if (!allow(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const tx = url.searchParams.get("tx") ?? "";
  if (from === null || !(from in CCTP_CHAINS) || !/^0x[0-9a-fA-F]{64}$/.test(tx)) {
    return NextResponse.json({ error: "Bad chain or transaction" }, { status: 400 });
  }
  try {
    const res = await fetch(`${IRIS_SANDBOX}/v2/messages/${CCTP_CHAINS[from as CctpChainKey].domain}?transactionHash=${tx}`, { cache: "no-store" });
    // Circle answers 404 until it has seen the burn.
    if (res.status === 404) return NextResponse.json({ state: "pending" }, { headers: { "cache-control": "no-store" } });
    if (!res.ok) throw new Error(String(res.status));
    return NextResponse.json(forwardStatus(await res.json()), { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach Circle" }, { status: 502 });
  }
}
