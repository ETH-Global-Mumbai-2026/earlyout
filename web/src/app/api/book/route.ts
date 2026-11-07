import { NextResponse } from "next/server";
import { publicError, serverEnv } from "@/server/env";
import { allow } from "@/server/limit";
import { mockBook } from "@/lib/source/mockBook";

type BookBody = { claims: unknown[]; funds: unknown[]; writer: string | null; explorer: string; source: string };
let cache: { at: number; value: Promise<BookBody> } | null = null;

async function readBook(): Promise<BookBody> {
  const { openClaims, fundDirectory } = await import("@/server/arkiv/read");
  const { ARKIV_EXPLORER } = await import("@/server/arkiv/client");
  const [claims, funds] = await Promise.all([openClaims(), fundDirectory()]);
  return { claims, funds, writer: process.env.ARKIV_WRITER_ADDRESS ?? null, explorer: ARKIV_EXPLORER, source: "arkiv:rabdi" };
}

/// GET /api/book: open claims and the fund directory, read from Arkiv only.
/// Cached five seconds per instance so every open tab shares one Arkiv query.
export async function GET(req: Request) {
  if (!allow(req, 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (serverEnv.mode === "mock") return NextResponse.json(mockBook());
  try {
    if (!cache || Date.now() - cache.at > 5_000) {
      const value = readBook();
      cache = { at: Date.now(), value };
      value.catch(() => (cache = null));
    }
    return NextResponse.json(await cache.value);
  } catch (e) {
    return NextResponse.json({ error: publicError(e, "Could not read the book") }, { status: 502 });
  }
}
