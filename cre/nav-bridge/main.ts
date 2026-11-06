// Earlyout NAV bridge: carries a fund's Chainlink NAV feed on Ethereum mainnet,
// plus the issuer's status from an outside API, to NavOracle on Arc testnet.
//
// Trigger: cron, hourly (the feeds update about daily). For each configured fund:
//   1. callContract on mainnet: latestRoundData() from the feed, at the last finalized block.
//      Feed decimals never change, so they come from config: one EVM read per fund keeps ten
//      funds inside CRE's per-execution read limit.
//   2. HTTP GET issuerStatusUrl?fund=... in node mode, consensus on identical status
//   3. encode (fund, nav, navDecimals, updatedAt, status), sign a report, writeReport to NavOracle

import {
  CronCapability,
  EVMClient,
  HTTPClient,
  Runner,
  TxStatus,
  bytesToHex,
  consensusIdenticalAggregation,
  encodeCallMsg,
  getNetwork,
  handler,
  hexToBase64,
  LAST_FINALIZED_BLOCK_NUMBER,
  type NodeRuntime,
  type Runtime,
} from "@chainlink/cre-sdk";
import { decodeFunctionResult, encodeAbiParameters, encodeFunctionData, parseAbi, parseAbiParameters, zeroAddress } from "viem";
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  feedChainName: z.string(),
  arcChainName: z.string(),
  oracleAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  issuerStatusUrl: z.string().regex(/^https?:\/\/\S+$/),
  gasLimit: z.string(),
  funds: z.array(
    z.object({
      symbol: z.string(),
      fund: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      feed: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      feedDecimals: z.number().int().min(0).max(18),
    }),
  ),
});
type Config = z.infer<typeof configSchema>;

const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

type Result = { fund: string; nav: string; decimals: number; updatedAt: string; status: number; txHash: string };

function selector(chainName: string) {
  const network = getNetwork({ chainFamily: "evm", chainSelectorName: chainName });
  if (!network) throw new Error(`Unknown chain name: ${chainName}`);
  return network.chainSelector.selector;
}

function readFeed(runtime: Runtime<Config>, evm: EVMClient, feed: `0x${string}`, decimals: number) {
  const roundCall = evm
    .callContract(runtime, {
      call: encodeCallMsg({ from: zeroAddress, to: feed, data: encodeFunctionData({ abi: feedAbi, functionName: "latestRoundData" }) }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();
  const round = decodeFunctionResult({ abi: feedAbi, functionName: "latestRoundData", data: bytesToHex(roundCall.data) });
  if (round[1] <= 0n) throw new Error(`Feed ${feed} returned a non-positive NAV`);
  return { nav: round[1], updatedAt: round[3], decimals };
}

// Runs on each node; consensus requires every node to see the same status string.
const fetchIssuerStatus = (fund: string) => (nodeRuntime: NodeRuntime<Config>): string => {
  const http = new HTTPClient();
  const resp = http.sendRequest(nodeRuntime, { url: `${nodeRuntime.config.issuerStatusUrl}?fund=${fund}`, method: "GET" as const }).result();
  const text = new TextDecoder().decode(resp.body);
  let body: { status?: string };
  try {
    body = JSON.parse(text) as { status?: string };
  } catch {
    throw new Error(`Issuer status API did not return JSON (HTTP ${resp.statusCode}): ${text.slice(0, 80)}`);
  }
  if (body.status !== "OK" && body.status !== "FAILED") throw new Error(`Issuer status API returned ${JSON.stringify(body)}`);
  return body.status;
};

const onCron = (runtime: Runtime<Config>): Result[] => {
  const feedEvm = new EVMClient(selector(runtime.config.feedChainName));
  const arcEvm = new EVMClient(selector(runtime.config.arcChainName));
  const results: Result[] = [];

  for (const f of runtime.config.funds) {
    // One fund's bad feed or a failed status call must not silence the others. On an issuer
    // API outage nothing is reported for that fund: its NAV ages, and the vault halts it once
    // the NAV passes the fund's maxAge. That is safer than guessing FAILED or OK.
    try {
      const feed = readFeed(runtime, feedEvm, f.feed as `0x${string}`, f.feedDecimals);
      const status = runtime.runInNodeMode(fetchIssuerStatus(f.fund), consensusIdenticalAggregation<string>())().result();
      const statusCode = status === "FAILED" ? 1 : 0;
      runtime.log(`${f.symbol}: nav=${feed.nav} dec=${feed.decimals} updatedAt=${feed.updatedAt} status=${status}`);

      const payload = encodeAbiParameters(parseAbiParameters("address fund, uint256 nav, uint8 navDecimals, uint64 updatedAt, uint8 status"), [
        f.fund as `0x${string}`,
        feed.nav,
        feed.decimals,
        feed.updatedAt,
        statusCode,
      ]);
      const report = runtime
        .report({ encodedPayload: hexToBase64(payload), encoderName: "evm", signingAlgo: "ecdsa", hashingAlgo: "keccak256" })
        .result();
      const write = arcEvm
        .writeReport(runtime, { receiver: runtime.config.oracleAddress, report, gasConfig: { gasLimit: runtime.config.gasLimit } })
        .result();
      if (write.txStatus !== TxStatus.SUCCESS) throw new Error(`writeReport failed: ${write.txStatus}`);
      const txHash = bytesToHex(write.txHash || new Uint8Array(32));
      runtime.log(`${f.symbol}: NavOracle updated on Arc, tx ${txHash}`);
      results.push({ fund: f.fund, nav: feed.nav.toString(), decimals: feed.decimals, updatedAt: feed.updatedAt.toString(), status: statusCode, txHash });
    } catch (e) {
      runtime.log(`${f.symbol}: skipped, ${(e as Error).message}`);
    }
  }
  return results;
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();
  return [handler(cron.trigger({ schedule: config.schedule }), onCron)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
