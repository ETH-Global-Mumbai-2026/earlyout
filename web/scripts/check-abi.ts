// Verifies every signature in src/lib/abi.ts exists in the compiled contracts (contracts/out).
//   pnpm check:abi   (run `forge build` in ../contracts first)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toFunctionSignature, toEventSignature, type Abi, type AbiFunction, type AbiEvent } from "viem";
import { claimTokenAbi, fundTokenAbi, issuerAbi, oracleAbi, registryAbi, vaultAbi, wrapperAbi } from "../src/lib/abi.ts";

const out = resolve(import.meta.dirname, "../../contracts/out");
const load = (name: string) => JSON.parse(readFileSync(resolve(out, `${name}.sol/${name}.json`), "utf8")).abi as Abi;
const sigs = (abi: Abi) =>
  new Set(abi.flatMap((i) => (i.type === "function" ? [toFunctionSignature(i as AbiFunction)] : i.type === "event" ? [toEventSignature(i as AbiEvent)] : [])));

const checks: [string, Abi][] = [
  ["FundToken", fundTokenAbi],
  ["FundRegistry", registryAbi],
  ["NavOracle", oracleAbi],
  ["IssuerStub", issuerAbi],
  ["ClaimToken", claimTokenAbi],
  ["ClaimWrapper", wrapperAbi],
  ["Vault", vaultAbi],
];
let bad = 0;
for (const [name, abi] of checks) {
  const have = sigs(load(name));
  for (const item of abi) {
    const sig = item.type === "function" ? toFunctionSignature(item as AbiFunction) : item.type === "event" ? toEventSignature(item as AbiEvent) : null;
    if (sig && !have.has(sig)) {
      console.log(`MISSING in ${name}: ${sig}`);
      bad++;
    }
  }
}
console.log(bad ? `${bad} mismatches` : "web ABI matches compiled contracts");
process.exit(bad ? 1 : 0);
