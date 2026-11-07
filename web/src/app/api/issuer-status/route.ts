import { NextResponse } from "next/server";
import { issuerAbi } from "@/lib/abi";
import { demoAuthorized, publicError, serverEnv } from "@/server/env";
import { allow } from "@/server/limit";
import { mockIssuerFailed, setMockIssuerFailed } from "@/lib/source/mock";


/// GET /api/issuer-status?fund=0x...  ->  {"status":"OK"} | {"status":"FAILED"}
/// This is the "outside API" the Chainlink CRE workflow reads. In chain mode it
/// reflects IssuerStub.failed() on Arc, so the stand-in issuer has one source of truth.
export async function GET(req: Request) {
  if (!allow(req, 60)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const fund = new URL(req.url).searchParams.get("fund") ?? undefined;
  try {
    const failed = await readFailed();
    return NextResponse.json({ status: failed ? "FAILED" : "OK", fund, source: serverEnv.mode === "mock" ? "mock" : "IssuerStub on Arc testnet", at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 502 });
  }
}

/// POST {"failed": true|false}: demo switch. Requires the DEMO_TOKEN in an x-demo-token header
/// (fails closed when DEMO_TOKEN is unset), so nobody can leave the live demo halted.
export async function POST(req: Request) {
  if (!allow(req, 10)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (serverEnv.mode !== "mock" && !demoAuthorized(req)) {
    return NextResponse.json({ error: "Demo key required" }, { status: 401 });
  }
  let body: { failed?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (typeof body.failed !== "boolean") return NextResponse.json({ error: "failed must be a boolean" }, { status: 400 });

  if (serverEnv.mode === "mock") {
    setMockIssuerFailed(body.failed);
    return NextResponse.json({ status: body.failed ? "FAILED" : "OK" });
  }
  const { opsWallet, arcPublic } = await import("@/server/arc");
  const wallet = opsWallet();
  if (!wallet || !serverEnv.issuer) return NextResponse.json({ error: "Server has no ops wallet configured" }, { status: 503 });
  try {
    const hash = await wallet.writeContract({ address: serverEnv.issuer, abi: issuerAbi, functionName: "setFailed", args: [body.failed] });
    const receipt = await arcPublic.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("setFailed reverted");
    const { readIssuerFailed } = await import("@/server/state");
    void readIssuerFailed(true).catch(() => undefined);
    return NextResponse.json({ status: body.failed ? "FAILED" : "OK", hash });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 502 });
  }
}

async function readFailed(): Promise<boolean> {
  if (serverEnv.mode === "mock") return mockIssuerFailed();
  const { readIssuerFailed } = await import("@/server/state");
  return readIssuerFailed();
}
