import { erc20Abi, maxUint256, parseAbi, type Hex } from "viem";
import { getAccount, readContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { wagmiConfig } from "../chain";
import { CCTP_CHAINS, FINALITY_STANDARD, FORWARD_HOOK, toBytes32, type CctpChainKey } from "../cctp";

const messengerAbi = parseAbi([
  "function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, bytes hookData)",
]);

/// On the source chain: approve TokenMessengerV2 if needed, then burn `amount`
/// with the forward hook so Circle mints `amount - maxFee` to the same address on Arc.
export async function bridgeIn(from: Exclude<CctpChainKey, "arc">, amount: bigint, maxFee: bigint): Promise<Hex> {
  const cfg = wagmiConfig;
  const src = CCTP_CHAINS[from];
  const me = getAccount(cfg).address;
  if (!me) throw new Error("Connect a wallet first");
  const chainId = src.chainId as (typeof cfg)["chains"][number]["id"];
  if (getAccount(cfg).chainId !== chainId) await switchChain(cfg, { chainId });

  const allowance = await readContract(cfg, { chainId, address: src.usdc, abi: erc20Abi, functionName: "allowance", args: [me, src.tokenMessenger] });
  if (allowance < amount) {
    const approve = await writeContract(cfg, { chainId, address: src.usdc, abi: erc20Abi, functionName: "approve", args: [src.tokenMessenger, maxUint256] });
    await waitForTransactionReceipt(cfg, { chainId, hash: approve });
  }
  const hash = await writeContract(cfg, {
    chainId,
    address: src.tokenMessenger,
    abi: messengerAbi,
    functionName: "depositForBurnWithHook",
    args: [amount, CCTP_CHAINS.arc.domain, toBytes32(me), src.usdc, `0x${"0".repeat(64)}`, maxFee, FINALITY_STANDARD, FORWARD_HOOK],
  });
  const receipt = await waitForTransactionReceipt(cfg, { chainId, hash });
  if (receipt.status !== "success") throw new Error(`The transfer failed on ${src.name}`);
  return hash;
}
