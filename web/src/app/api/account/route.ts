import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { publicError } from "@/server/env";
import { allow } from "@/server/limit";
import { readAccount, readAllowance } from "@/server/state";
import { toWire } from "@/lib/wire";

export const dynamic = "force-dynamic";
const noStore = { "cache-control": "no-store" };

/// GET /api/account?address=0x...            -> the wallet's balances and vault position
/// GET /api/account?address=0x...&token=&spender=  -> {"allowance": "123n"}
/// Read on the server so the browser does not hit Arc's rate-limited public RPC.
export async function GET(req: Request) {
  if (!allow(req, 120)) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: noStore });
  const q = new URL(req.url).searchParams;
  const address = q.get("address") ?? "";
  if (!isAddress(address)) return NextResponse.json({ error: "address must be an EVM address" }, { status: 400, headers: noStore });
  try {
    const token = q.get("token");
    const spender = q.get("spender");
    if (token || spender) {
      if (!token || !spender || !isAddress(token) || !isAddress(spender)) return NextResponse.json({ error: "token and spender must be EVM addresses" }, { status: 400, headers: noStore });
      const allowance = await readAllowance(token as Address, address as Address, spender as Address);
      return new NextResponse(toWire({ allowance }), { headers: { "content-type": "application/json", ...noStore } });
    }
    const account = await readAccount(address as Address, q.has("fresh"));
    return new NextResponse(toWire(account), { headers: { "content-type": "application/json", ...noStore } });
  } catch (e) {
    const message = publicError(e, "Read failed");
    return NextResponse.json({ error: message }, { status: /Unsupported/.test(message) ? 400 : 502, headers: noStore });
  }
}
