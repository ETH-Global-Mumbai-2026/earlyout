import "server-only";
import { createPublicClient, encodeAbiParameters, http, parseAbi, type Address, type Hex } from "viem";
import { mainnet } from "viem/chains";
import { oracleAbi } from "@/lib/abi";
import { arcPublic, opsWallet } from "./arc";
import { serverEnv } from "./env";

/// Reads a Chainlink NAV feed on Ethereum mainnet plus the issuer status API and
/// writes the report to NavOracle on Arc. Same report encoding CRE will use, so the
/// contracts cannot tell the two apart. Used until the CRE forwarder takes over.

const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
]);

export type FeedMap = { fund: Address; feed: Address }[];

export function feedMap(): FeedMap {
  // FUND_FEEDS="0xfund:0xfeed,0xfund2:0xfeed2"
  const raw = process.env.FUND_FEEDS ?? "";
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [fund, feed] = p.split(":");
      return { fund: fund as Address, feed: feed as Address };
    });
}

export const ethPublic = createPublicClient({ chain: mainnet, transport: http(process.env.ETH_RPC ?? "https://ethereum-rpc.publicnode.com") });

export async function readFeed(feed: Address) {
  const [round, decimals, description] = await Promise.all([
    ethPublic.readContract({ address: feed, abi: feedAbi, functionName: "latestRoundData" }),
    ethPublic.readContract({ address: feed, abi: feedAbi, functionName: "decimals" }),
    ethPublic.readContract({ address: feed, abi: feedAbi, functionName: "description" }),
  ]);
  if (round[1] <= 0n) throw new Error(`${description}: non-positive answer`);
  return { nav: round[1], decimals, updatedAt: round[3], description };
}

export function encodeReport(fund: Address, nav: bigint, navDecimals: number, updatedAt: bigint, status: 0 | 1): Hex {
  return encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "uint8" }, { type: "uint64" }, { type: "uint8" }],
    [fund, nav, navDecimals, updatedAt, status],
  );
}

export async function pushNav(issuerFailed: boolean) {
  const wallet = opsWallet();
  const oracle = process.env.NEXT_PUBLIC_NAV_ORACLE as Address | undefined;
  if (!wallet) throw new Error("OPS_PRIVATE_KEY is not set");
  if (!oracle) throw new Error("NEXT_PUBLIC_NAV_ORACLE is not set");
  const forwarder = await arcPublic.readContract({ address: oracle, abi: oracleAbi, functionName: "forwarder" });
  if (forwarder.toLowerCase() !== wallet.account.address.toLowerCase()) {
    throw new Error(`Oracle forwarder is ${forwarder}, not the ops wallet. CRE may already own it.`);
  }
  const results = [];
  for (const { fund, feed } of feedMap()) {
    const f = await readFeed(feed);
    const report = encodeReport(fund, f.nav, f.decimals, f.updatedAt, issuerFailed ? 1 : 0);
    const hash = await wallet.writeContract({ address: oracle, abi: oracleAbi, functionName: "onReport", args: ["0x", report] });
    const receipt = await arcPublic.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`onReport reverted for ${fund}`);
    results.push({ fund, feed: f.description, nav: f.nav.toString(), decimals: f.decimals, updatedAt: Number(f.updatedAt), status: issuerFailed ? "FAILED" : "OK", hash });
  }
  return { mode: serverEnv.mode, results };
}
