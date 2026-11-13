import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { publicError } from "@/server/env";
import { allow } from "@/server/limit";
import { readSales } from "@/server/sales";

export const dynamic = "force-dynamic";

/// GET /api/sales?address=0x...: every sale paid to that wallet, from Arc's ClaimSold logs.
export async function GET(req: Request) {
  if (!allow(req, 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const address = new URL(req.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) return NextResponse.json({ error: "Bad address" }, { status: 400 });
  try {
    const sales = await readSales(getAddress(address));
    return NextResponse.json({ sales }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Could not read sales") }, { status: 502 });
  }
}
