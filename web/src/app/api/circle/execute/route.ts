import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { allow } from "@/server/limit";
import { CircleError, circleConfigured, contractExecution } from "@/server/circle";
import { addresses, payoutRouter } from "@/lib/addresses";
import { USDC_ADDRESS } from "@/lib/chain";
import { readState } from "@/server/state";

export const dynamic = "force-dynamic";

/// Only our own contracts, USDC and listed fund tokens: the server's Circle
/// key must not become a way to call anything on anyone's behalf.
async function allowedContracts(): Promise<Set<string>> {
  const { funds } = await readState();
  const list = [addresses.wrapper, addresses.vault, addresses.claims, USDC_ADDRESS, payoutRouter, ...funds.map((f) => f.address)];
  return new Set(list.filter((a): a is `0x${string}` => !!a).map((a) => a.toLowerCase()));
}

const SIGNATURE = /^[A-Za-z_][A-Za-z0-9_]*\((?:[a-z0-9\[\],]*)\)$/;

/// POST /api/circle/execute: a PIN challenge for one contract call from the user's Circle wallet.
export async function POST(req: Request) {
  if (!allow(req, 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!circleConfigured()) return NextResponse.json({ error: "Circle wallets are not set up here" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as {
    userToken?: string;
    walletId?: string;
    contractAddress?: string;
    abiFunctionSignature?: string;
    abiParameters?: unknown[];
  };
  if (
    !b.userToken ||
    !b.walletId ||
    !b.contractAddress ||
    !isAddress(b.contractAddress) ||
    !b.abiFunctionSignature ||
    !SIGNATURE.test(b.abiFunctionSignature) ||
    !Array.isArray(b.abiParameters) ||
    !b.abiParameters.every((p) => typeof p === "string" || typeof p === "boolean")
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!(await allowedContracts()).has(b.contractAddress.toLowerCase())) {
    return NextResponse.json({ error: "That contract is not part of Earlyout" }, { status: 403 });
  }
  try {
    const r = await contractExecution({
      userToken: b.userToken,
      walletId: b.walletId,
      contractAddress: getAddress(b.contractAddress),
      abiFunctionSignature: b.abiFunctionSignature,
      abiParameters: b.abiParameters as (string | boolean)[],
    });
    return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof CircleError ? e.message : "Circle is not reachable" }, { status: 502 });
  }
}
