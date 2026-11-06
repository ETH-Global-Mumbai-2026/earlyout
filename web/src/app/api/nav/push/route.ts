import { NextResponse } from "next/server";
import { issuerAbi } from "@/lib/abi";
import { demoAuthorized, serverEnv } from "@/server/env";

/// POST or GET /api/nav/push: carry the mainnet NAV feed and issuer status to NavOracle on Arc.
/// Stand-in for the CRE workflow; refuses to run once CRE owns the forwarder.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}` && !demoAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (serverEnv.mode === "mock") return NextResponse.json({ mode: "mock", results: [] });
  try {
    const { arcPublic } = await import("@/server/arc");
    const { pushNav } = await import("@/server/nav");
    if (!serverEnv.issuer) throw new Error("NEXT_PUBLIC_ISSUER_STUB is not set");
    const failed = await arcPublic.readContract({ address: serverEnv.issuer, abi: issuerAbi, functionName: "failed" });
    return NextResponse.json(await pushNav(failed));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const GET = run;
export const POST = run;
