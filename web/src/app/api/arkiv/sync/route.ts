import { NextResponse } from "next/server";
import { publicError, serverEnv } from "@/server/env";
import { allow } from "@/server/limit";

/// POST or GET /api/arkiv/sync: index new Arc events into Arkiv. Public on purpose, so the
/// Book shows a sale within seconds: it is idempotent, single flight and rate limited, and it
/// only copies what is already on chain.
/// POST {"tx":"0x..."} indexes that one sale from its receipt, which the app sends right
/// after a sale; without it the route scans the next block window from the cursor.
async function run(req: Request) {
  if (!allow(req, 12)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (serverEnv.mode === "mock") return NextResponse.json({ mode: "mock", synced: 0 });
  let tx: string | undefined;
  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { tx?: unknown };
      if (typeof body.tx === "string") tx = body.tx;
    } catch {
      // No body: a plain scan.
    }
  }
  if (tx !== undefined && !/^0x[0-9a-fA-F]{64}$/.test(tx)) return NextResponse.json({ error: "tx must be a transaction hash" }, { status: 400 });
  try {
    const { syncOnce, syncSale } = await import("@/server/arkiv/sync");
    return NextResponse.json(tx ? await syncSale(tx as `0x${string}`) : await syncOnce());
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Sync failed") }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
