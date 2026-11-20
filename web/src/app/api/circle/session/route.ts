import { NextResponse } from "next/server";
import { allow } from "@/server/limit";
import { CircleError, circleConfigured, openSession } from "@/server/circle";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/// POST /api/circle/session { userId }: a Circle user token for this browser's
/// user id, plus its Arc wallet or the challenge that creates it.
export async function POST(req: Request) {
  if (!allow(req, 20)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!circleConfigured()) return NextResponse.json({ error: "Circle wallets are not set up here" }, { status: 503 });
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  if (!userId || !UUID.test(userId)) return NextResponse.json({ error: "Bad user id" }, { status: 400 });
  try {
    return NextResponse.json(await openSession(userId), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof CircleError ? e.message : "Circle is not reachable" }, { status: 502 });
  }
}
