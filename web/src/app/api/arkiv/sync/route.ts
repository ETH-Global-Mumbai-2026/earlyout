import { NextResponse } from "next/server";
import { serverEnv } from "@/server/env";

/// POST or GET /api/arkiv/sync: index new Arc events into Arkiv. Idempotent.
/// Optional CRON_SECRET (Vercel cron sends it as a bearer token).
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}` && req.headers.get("x-demo-token") !== serverEnv.demoToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (serverEnv.mode === "mock") return NextResponse.json({ mode: "mock", synced: 0 });
  try {
    const { syncOnce } = await import("@/server/arkiv/sync");
    const report = await syncOnce();
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
