import { NextResponse } from "next/server";
import { invalidateState, readState } from "@/server/state";
import { toWire } from "@/lib/wire";

export const dynamic = "force-dynamic";

/// GET /api/state: every listed fund and the vault, read from Arc in one multicall.
/// Cached at the edge for 10 seconds so visitors share one read.
export async function GET(req: Request) {
  try {
    if (new URL(req.url).searchParams.has("fresh")) invalidateState();
    const state = await readState();
    return new NextResponse(toWire(state), { headers: { "content-type": "application/json", "cache-control": "public, s-maxage=10, stale-while-revalidate=50" } });
  } catch (e) {
    const message = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : "Read failed";
    return NextResponse.json({ error: message }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
