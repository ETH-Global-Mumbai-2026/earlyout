import { NextResponse } from "next/server";
import { publicError } from "@/server/env";
import { allow } from "@/server/limit";
import { readReceipt } from "@/server/state";

export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

/// GET /api/receipt?hash=0x...  -> {"status":"pending"|"success"|"reverted","logs":[...]}
/// The app polls this after the wallet sends a transaction.
export async function GET(req: Request) {
  if (!allow(req, 240)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: noStore });
  const hash = new URL(req.url).searchParams.get("hash") ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return NextResponse.json({ error: "hash must be a transaction hash" }, { status: 400, headers: noStore });
  try {
    return NextResponse.json(await readReceipt(hash as `0x${string}`), { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Read failed") }, { status: 502, headers: noStore });
  }
}
