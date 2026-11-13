import Link from "next/link";
import { TESTNET } from "@/lib/site";

/// Site-wide notice while Earlyout runs on Arc testnet. Not dismissible.
export function TestnetStrip() {
  if (!TESTNET) return null;
  return (
    <div
      role="note"
      aria-label="Testnet notice"
      className="flex h-7 w-full items-center justify-center gap-2 border-b border-hairline bg-surface-2 px-4 font-mono text-[11px] text-muted"
    >
      <span className="truncate">Testnet preview. Test USDC only. Fund tokens are stand-ins.</span>
      <Link href="/legal" className="shrink-0 text-ink-2 underline underline-offset-2 hover:text-ink">
        Learn more
      </Link>
    </div>
  );
}
