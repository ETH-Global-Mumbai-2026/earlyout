import { NextResponse } from "next/server";
import { invalidateState, readState } from "@/server/state";
import { allow } from "@/server/limit";
import { toWire } from "@/lib/wire";

export const dynamic = "force-dynamic";

/// GET /api/state: every listed fund and the vault, read from Arc in one multicall.
/// Cached at the edge for 10 seconds so visitors share one read.
export async function GET(req: Request) {
  if (!allow(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "cache-control": "no-store" } });
  try {
    // After a user's own transaction the app asks for a fresh read once. The
    // server honours that at most every five seconds and never caches it at the edge.
    const fresh = new URL(req.url).searchParams.has("fresh");
    if (fresh) invalidateState();
    const state = await readState();
    const cacheControl = fresh ? "no-store" : "public, s-maxage=10, stale-while-revalidate=50";
    return new NextResponse(toWire(state), { headers: { "content-type": "application/json", "cache-control": cacheControl } });
  } catch (e) {
    const message = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : "Read failed";
    return NextResponse.json({ error: message }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
