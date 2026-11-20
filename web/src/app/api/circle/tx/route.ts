import { NextResponse } from "next/server";
import { allow } from "@/server/limit";
import { CircleError, circleConfigured, transactionByRef } from "@/server/circle";

export const dynamic = "force-dynamic";

/// POST /api/circle/tx { userToken, walletId, refId }: the transaction started
/// with that reference and its Arc hash once sent. POST keeps the token out of URLs.
export async function POST(req: Request) {
  if (!allow(req, 120)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!circleConfigured()) return NextResponse.json({ error: "Circle wallets are not set up here" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { userToken?: string; walletId?: string; refId?: string };
  if (!b.userToken || !b.walletId || !b.refId) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    return NextResponse.json({ tx: (await transactionByRef(b.userToken, b.walletId, b.refId)) ?? null }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof CircleError ? e.message : "Circle is not reachable" }, { status: 502 });
  }
}
