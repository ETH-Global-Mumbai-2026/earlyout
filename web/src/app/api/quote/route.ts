import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { readQuote } from "@/server/state";
import { allow } from "@/server/limit";
import { toWire } from "@/lib/wire";

export const dynamic = "force-dynamic";

/// GET /api/quote?fund=0x..&amount=<18dp units>: the Vault's own quoteFund, cached 10 seconds per input.
export async function GET(req: Request) {
  if (!allow(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "cache-control": "no-store" } });
  const url = new URL(req.url);
  const fund = url.searchParams.get("fund") ?? "";
  const amountRaw = url.searchParams.get("amount") ?? "";
  if (!isAddress(fund) || !/^\d{1,40}$/.test(amountRaw)) return NextResponse.json({ error: "Bad fund or amount" }, { status: 400 });
  try {
    const q = await readQuote(getAddress(fund), BigInt(amountRaw));
    return new NextResponse(toWire(q), { headers: { "content-type": "application/json", "cache-control": "public, s-maxage=10, stale-while-revalidate=30" } });
  } catch (e) {
    const message = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : "Quote failed";
    return NextResponse.json({ error: message }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
