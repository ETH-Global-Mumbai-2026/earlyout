import { NextResponse } from "next/server";
import { serverEnv } from "@/server/env";
import { mockBook } from "@/lib/source/mockBook";

/// GET /api/book: open claims and the fund directory, read from Arkiv only.
export async function GET() {
  if (serverEnv.mode === "mock") return NextResponse.json(mockBook());
  try {
    const { openClaims, fundDirectory } = await import("@/server/arkiv/read");
    const { ARKIV_EXPLORER } = await import("@/server/arkiv/client");
    const [claims, funds] = await Promise.all([openClaims(), fundDirectory()]);
    return NextResponse.json({ claims, funds, writer: process.env.ARKIV_WRITER_ADDRESS ?? null, explorer: ARKIV_EXPLORER, source: "arkiv:rabdi" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
