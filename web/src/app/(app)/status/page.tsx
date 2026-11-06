"use client";

import { Button, Card, Notice, Row, Spinner } from "@/components/ui/primitives";
import { demoKey, errorMessage, setDemoKey, useFunds, useIssuerFailed, useMarkImpaired, usePushNav, useSetIssuerFailed, useWallet } from "@/hooks/useEarlyout";
import { useState } from "react";
import { fmtDate, fmtDuration, fmtNav, fmtUsdc, timeAgo } from "@/lib/format";
import { MODE } from "@/lib/addresses";
import { useNow } from "@/hooks/useNow";

export default function StatusPage() {
  const funds = useFunds();
  const failed = useIssuerFailed();
  const setFailed = useSetIssuerFailed();
  const impair = useMarkImpaired();
  const wallet = useWallet();
  const pushNav = usePushNav();
  const [key, setKey] = useState(() => demoKey());
  const now = useNow();

  return (
    <div className="space-y-5">
      <header>
        <div className="t-eyebrow">04 · Status</div>
        <h1 className="t-display mt-2">Status</h1>
        <p className="t-body mt-2 text-muted">
          NAV comes from the Chainlink ACRED NAV feed on Ethereum mainnet, carried to Arc by a Chainlink CRE workflow. Issuer status rides in the same report.
        </p>
      </header>

      {funds.isPending && (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted" />
        </div>
      )}
      {funds.isError && <Notice tone="error">{errorMessage(funds.error)}</Notice>}

      {funds.data?.map((f) => {
        const stale = now - f.navUpdatedAt > f.maxAge;
        const tone = f.status === 1 || f.impaired ? "bg-halt" : stale ? "bg-refuse" : "bg-buy";
        return (
          <Card key={f.address}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="t-headline">{f.symbol}</h2>
                <div className="t-caption">{f.name}</div>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span className={`size-2 rounded-full ${tone}`} aria-hidden />
                {f.impaired ? "Impaired" : f.status === 1 ? "Issuer failed" : stale ? "NAV stale" : "Healthy"}
              </span>
            </div>
            <div className="hairline-rows mt-3">
              <Row label="NAV" value={fmtNav(f.nav)} hint={`Updated ${timeAgo(f.navUpdatedAt, now)}, ${fmtDate(f.navUpdatedAt)}`} />
              <Row label="Pays out after" value={fmtDuration(f.settlementDelay)} hint={`Payout dates round up to the next ${fmtDuration(f.window)}`} />
              <Row label="Vault exposure" value={`${fmtUsdc(f.deployedUsdc)} of ${fmtUsdc(f.capUsdc)}`} />
              <Row label="Halts if NAV older than" value={fmtDuration(f.maxAge)} />
            </div>
            {f.status === 1 && !f.impaired && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="t-caption">The issuer reported failure. Anyone can write this fund down for every LP in one transaction.</span>
                <Button variant="danger" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => impair.mutate(f.address)} loading={impair.isPending} disabled={!wallet.isConnected}>
                  Mark impaired
                </Button>
              </div>
            )}
          </Card>
        );
      })}
      {impair.isError && <Notice tone="error">{errorMessage(impair.error)}</Notice>}

      <Card>
        <h2 className="t-headline">Demo controls</h2>
        <p className="t-caption mt-1">
          The issuer here is a stand-in. This switch flips what the issuer status API returns, which the CRE workflow carries into the oracle on its next run.
          {MODE === "chain" && " It also sets the stand-in issuer on Arc, so settlement stops."}
        </p>
        {MODE === "chain" && (
          <label className="control mt-3 flex items-center gap-2 px-3 py-2">
            <span className="t-eyebrow shrink-0">Demo key</span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setDemoKey(e.target.value);
              }}
              placeholder="Required to flip the issuer"
              className="font-mono text-sm"
              aria-label="Demo key"
            />
          </label>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="t-body">
            Issuer status: <strong>{failed.data === undefined ? "…" : failed.data ? "FAILED" : "OK"}</strong>
          </span>
          <Button
            variant={failed.data ? "secondary" : "danger"}
            size="sm"
            onClick={() => setFailed.mutate(!failed.data)}
            loading={setFailed.isPending}
            disabled={failed.data === undefined}
          >
            {failed.data ? "Restore issuer" : "Simulate issuer failure"}
          </Button>
        </div>
        {setFailed.isError && <Notice tone="error">{errorMessage(setFailed.error)}</Notice>}
        {MODE === "chain" && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-4">
            <span className="t-caption">Carry the latest Chainlink NAV and issuer status to the oracle now. Same report CRE sends on its schedule.</span>
            <Button variant="secondary" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => pushNav.mutate()} loading={pushNav.isPending}>
              Refresh NAV
            </Button>
          </div>
        )}
        {pushNav.isError && <Notice tone="error">{errorMessage(pushNav.error)}</Notice>}
      </Card>
    </div>
  );
}
