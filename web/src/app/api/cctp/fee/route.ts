import { NextResponse } from "next/server";
import { allow } from "@/server/limit";
import { CCTP_CHAINS, IRIS_SANDBOX, maxFeeFor, receivedAfterFee, type CctpChainKey, type FeeRow } from "@/lib/cctp";

export const dynamic = "force-dynamic";

const isKey = (k: string | null): k is CctpChainKey => k !== null && k in CCTP_CHAINS;

/// GET /api/cctp/fee?from=arc&to=base&amount=<usdc 6dp>: Circle's forwarding
/// quote turned into the maxFee to send and what the recipient receives.
export async function GET(req: Request) {
  if (!allow(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const amountRaw = url.searchParams.get("amount") ?? "";
  if (!isKey(from) || !isKey(to) || from === to || !/^\d{1,30}$/.test(amountRaw)) {
    return NextResponse.json({ error: "Bad chain or amount" }, { status: 400 });
  }
  const amount = BigInt(amountRaw);
  try {
    const res = await fetch(`${IRIS_SANDBOX}/v2/burn/USDC/fees/${CCTP_CHAINS[from].domain}/${CCTP_CHAINS[to].domain}?forward=true`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`Circle fee quote failed (${res.status})`);
    const rows = (await res.json()) as FeeRow[];
    const maxFee = maxFeeFor(rows, amount);
    return NextResponse.json(
      { maxFee: maxFee.toString(), received: receivedAfterFee(amount, maxFee).toString() },
      { headers: { "cache-control": "public, s-maxage=30" } },
    );
  } catch {
    return NextResponse.json({ error: "Could not get a fee quote from Circle" }, { status: 502 });
  }
}
