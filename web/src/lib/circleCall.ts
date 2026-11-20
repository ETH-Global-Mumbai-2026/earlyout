import type { Abi, AbiFunction } from "viem";

export type CircleCall = { abiFunctionSignature: string; abiParameters: (string | boolean)[] };

/// Circle's contractExecution takes a function signature and its arguments as
/// strings (booleans stay booleans). Built from the same viem ABI the app uses,
/// so a Circle wallet and a browser wallet send the exact same call.
export function toCircleCall(abi: Abi, functionName: string, args: readonly unknown[]): CircleCall {
  const fn = abi.find((i): i is AbiFunction => i.type === "function" && i.name === functionName && i.inputs.length === args.length);
  if (!fn) throw new Error(`No ${functionName} with ${args.length} arguments in this ABI`);
  return {
    abiFunctionSignature: `${fn.name}(${fn.inputs.map((i) => i.type).join(",")})`,
    abiParameters: args.map((a) => (typeof a === "boolean" ? a : String(a))),
  };
}
