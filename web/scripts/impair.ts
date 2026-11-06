// Owner tool for the failure demo: write a fund down, or clear it again afterwards.
//   pnpm impair mark  <fund> [fund...]   markImpaired (anyone may call it while the issuer is FAILED)
//   pnpm impair clear <fund> [fund...]   clearImpaired (owner only), so quotes and LP flows return
// Reads NEXT_PUBLIC_VAULT and OPS_PRIVATE_KEY from .env.local. Never prints the key.
import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const vault = process.env.NEXT_PUBLIC_VAULT as Address;
const rpc = process.env.ARC_RPC ?? "https://rpc.testnet.arc.io";
const chain = { id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } } as const;
const abi = parseAbi(["function markImpaired(address fund)", "function clearImpaired(address fund)", "function impaired(address fund) view returns (bool)"]);

const [action, ...funds] = process.argv.slice(2);
if ((action !== "mark" && action !== "clear") || funds.length === 0) throw new Error("usage: pnpm impair mark|clear <fund> [fund...]");
if (!vault || !process.env.OPS_PRIVATE_KEY) throw new Error("Set NEXT_PUBLIC_VAULT and OPS_PRIVATE_KEY in .env.local");

const account = privateKeyToAccount(process.env.OPS_PRIVATE_KEY as Hex);
const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });

for (const fund of funds as Address[]) {
  const hash = await wallet.writeContract({ address: vault, abi, functionName: action === "mark" ? "markImpaired" : "clearImpaired", args: [fund] });
  const r = await pub.waitForTransactionReceipt({ hash });
  const now = await pub.readContract({ address: vault, abi, functionName: "impaired", args: [fund] });
  console.log(`${action} ${fund}: ${r.status}, impaired=${now}, tx ${hash}`);
}
