import { NextResponse } from "next/server";
import { publicError } from "@/server/env";
import { allow } from "@/server/limit";
import { readClaimPosition } from "@/server/state";
import { toWire } from "@/lib/wire";

export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

/// GET /api/claim?id=0x...&amount=<18dp units>: what the vault holds in a claim and
/// what a buyer pays for `amount` of it (all of it when amount is omitted).
export async function GET(req: Request) {
  if (!allow(req, 120)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: noStore });
  const q = new URL(req.url).searchParams;
  const id = q.get("id") ?? "";
  const amountRaw = q.get("amount");
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(id)) return NextResponse.json({ error: "id must be a claim id" }, { status: 400, headers: noStore });
  if (amountRaw !== null && !/^\d{1,40}$/.test(amountRaw)) return NextResponse.json({ error: "Bad amount" }, { status: 400, headers: noStore });
  try {
    const p = await readClaimPosition(BigInt(id), amountRaw ? BigInt(amountRaw) : undefined);
    return new NextResponse(toWire(p), { headers: { "content-type": "application/json", ...noStore } });
  } catch (e) {
    const message = publicError(e, "Read failed");
    return NextResponse.json({ error: message }, { status: /Fund not listed/.test(message) ? 404 : 502, headers: noStore });
  }
}
