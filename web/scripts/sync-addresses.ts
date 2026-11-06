// Copies deployed addresses from contracts/deployments/arc-testnet.json into web/.env.local.
//   pnpm sync-addresses
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../../contracts/deployments/arc-testnet.json");
const dst = resolve(import.meta.dirname, "../.env.local");
if (!existsSync(src)) throw new Error(`No deployment file at ${src}`);

const raw = JSON.parse(readFileSync(src, "utf8")) as Record<string, unknown>;
const flat: Record<string, string> = {};
(function walk(o: unknown, prefix = "") {
  if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)) flat[(prefix + k).toLowerCase()] = v;
      else walk(v, prefix + k + ".");
    }
  }
})(raw);

const wanted: Record<string, string[]> = {
  NEXT_PUBLIC_FUND_REGISTRY: ["fundregistry", "registry"],
  NEXT_PUBLIC_NAV_ORACLE: ["navoracle", "oracle"],
  NEXT_PUBLIC_ISSUER_STUB: ["issuerstub", "issuer"],
  NEXT_PUBLIC_CLAIM_TOKEN: ["claimtoken", "claims"],
  NEXT_PUBLIC_CLAIM_WRAPPER: ["claimwrapper", "wrapper"],
  NEXT_PUBLIC_VAULT: ["vault"],
};

const lines = existsSync(dst) ? readFileSync(dst, "utf8").split("\n") : [];
const set = new Map(lines.filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l] as const));
const missing: string[] = [];
for (const [env, names] of Object.entries(wanted)) {
  const key = Object.keys(flat).find((k) => names.some((n) => k === n || k.endsWith("." + n)));
  if (!key) {
    missing.push(env);
    continue;
  }
  set.set(env, `${env}=${flat[key]}`);
}
if (missing.length) throw new Error(`Could not find in deployment file: ${missing.join(", ")}. Keys seen: ${Object.keys(flat).join(", ")}`);
const block = typeof raw.block === "number" || typeof raw.block === "string" ? String(raw.block) : typeof raw.startBlock === "number" ? String(raw.startBlock) : undefined;
if (block) set.set("ARC_DEPLOY_BLOCK", `ARC_DEPLOY_BLOCK=${block}`);
set.set("NEXT_PUBLIC_MODE", "NEXT_PUBLIC_MODE=chain");
writeFileSync(dst, [...set.values()].join("\n") + "\n");
console.log(`Wrote ${dst}:`);
for (const env of Object.keys(wanted)) console.log(`  ${set.get(env)}`);
