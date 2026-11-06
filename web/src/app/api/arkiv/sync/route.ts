import { NextResponse } from "next/server";
import { publicError, serverEnv } from "@/server/env";
import { allow } from "@/server/limit";

/// POST or GET /api/arkiv/sync: index new Arc events into Arkiv. Public on purpose, so the
/// Book shows a sale within seconds: it is idempotent, single flight and rate limited, and it
/// only copies what is already on chain.
async function run(req: Request) {
  if (!allow(req, 6)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (serverEnv.mode === "mock") return NextResponse.json({ mode: "mock", synced: 0 });
  try {
    const { syncOnce } = await import("@/server/arkiv/sync");
    return NextResponse.json(await syncOnce());
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Sync failed") }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
