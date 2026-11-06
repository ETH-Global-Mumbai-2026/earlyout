"use client";

import { useFunds, useVault } from "@/hooks/useEarlyout";
import { fmtNav, fmtUsdc } from "@/lib/format";
import { ShaderPanel } from "../ShaderPanel";

/// Hero art: the shader, captioned with live numbers read from Arc testnet.
export function LiveHeroPanel({ className }: { className?: string }) {
  const funds = useFunds();
  const vault = useVault();
  const lead = funds.data?.[0];
  const failed = funds.data?.some((f) => f.status === 1 || f.impaired) ?? false;
  const caption = lead ? (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${failed ? "bg-halt" : "bg-buy"}`} />
        LIVE ON ARC
      </span>
      <span>{lead.symbol} NAV {fmtNav(lead.nav)}</span>
      {vault.data && <span>SHARE {fmtUsdc(vault.data.sharePrice, true)}</span>}
    </>
  ) : (
    <span>Reading Arc testnet</span>
  );
  return <ShaderPanel shape="warp" tone={failed ? "halt" : "ok"} caption={caption} className={className} />;
}
