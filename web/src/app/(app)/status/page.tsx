"use client";

import { useState } from "react";
import { Badge, Button, Notice, Panel, Spinner } from "@/components/ui/primitives";
import { Meter } from "@/components/viz/Meter";
import { AppHeader } from "@/components/AppHeader";
import { demoKey, errorMessage, setDemoKey, useFunds, useIssuerFailed, useMarkImpaired, usePushNav, useSetIssuerFailed, useWallet } from "@/hooks/useEarlyout";
import { useNow } from "@/hooks/useNow";
import { MODE } from "@/lib/addresses";
import { isScheduled } from "@/lib/glossary";
import { fmtDate, fmtDuration, fmtNav, fmtUsdc, timeAgo } from "@/lib/format";

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
    <div className="grid gap-4">
      <AppHeader title="Oracle and risk">
        Check that prices are fresh and the issuer is healthy. Each fund&apos;s net asset value (NAV) comes from its Chainlink feed on Ethereum mainnet, carried to Arc by a Chainlink Runtime Environment (CRE) workflow with the issuer&apos;s status.
      </AppHeader>

      {funds.isPending && (
        <div className="flex justify-center py-10 text-muted">
          <Spinner />
        </div>
      )}
      {funds.isError && <Notice tone="error">{errorMessage(funds.error)}</Notice>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-4">
          {funds.data?.map((f) => {
            const stale = now - f.navUpdatedAt > f.maxAge;
            const tone = f.status === 1 || f.impaired ? "bad" : stale ? "warn" : "good";
            const label = f.impaired ? "Impaired" : f.status === 1 ? "Issuer failed" : stale ? "NAV stale" : "Healthy";
            return (
              <Panel
                key={f.address}
                title={
                  <span className="flex items-center gap-2">
                    {f.symbol} <span className="t-caption font-normal">{f.name}</span>
                  </span>
                }
                note={
                  <Badge tone={tone}>
                    <span className="badge-dot" />
                    {label}
                  </Badge>
                }
                bodyClassName="grid gap-4 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Meter label="NAV age against the halt limit" value={now - f.navUpdatedAt} max={f.maxAge} valueText={`${fmtDuration(Math.max(0, now - f.navUpdatedAt))} of ${fmtDuration(f.maxAge)}`} />
                  {isScheduled(f.symbol) ? (
                    <Meter label="Vault exposure against the cap" value={Number(f.deployedUsdc)} max={Number(f.capUsdc)} valueText={`${fmtUsdc(f.deployedUsdc)} of ${fmtUsdc(f.capUsdc)}`} />
                  ) : (
                    <p className="t-caption self-center">Pays within days, so the vault never buys it. Priced here for comparison.</p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
                  <div>
                    <dt className="t-eyebrow">NAV</dt>
                    <dd className="num mt-0.5">{fmtNav(f.nav)}</dd>
                  </div>
                  <div>
                    <dt className="t-eyebrow">Updated</dt>
                    <dd className="num mt-0.5" title={fmtDate(f.navUpdatedAt)}>
                      {timeAgo(f.navUpdatedAt, now)}
                    </dd>
                  </div>
                  <div>
                    <dt className="t-eyebrow">Pays out after</dt>
                    <dd className="num mt-0.5">{fmtDuration(f.settlementDelay)}</dd>
                  </div>
                  <div>
                    <dt className="t-eyebrow">Halts after</dt>
                    <dd className="num mt-0.5">{fmtDuration(f.maxAge)}</dd>
                  </div>
                </dl>
                {f.status === 1 && !f.impaired && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-halt/30 bg-halt-soft px-3 py-2.5">
                    <span className="text-[13px]">The issuer reported failure. Anyone can write this fund down for every liquidity provider (LP) in one transaction.</span>
                    <Button variant="danger" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => impair.mutate(f.address)} loading={impair.isPending} disabled={!wallet.isConnected}>
                      Mark impaired
                    </Button>
                  </div>
                )}
              </Panel>
            );
          })}
          {impair.isError && <Notice tone="error">{errorMessage(impair.error)}</Notice>}
        </div>

        <Panel title="Demo controls" note="Stand-in issuer" bodyClassName="grid gap-4 p-4">
          <p className="t-caption">
            This switch flips what the issuer status API returns, which the CRE workflow carries into the oracle.
            {MODE === "chain" && " It also sets the stand-in issuer on Arc, so settlement stops."}
          </p>
          {MODE === "chain" && (
            <label className="control flex items-center gap-2 px-3 py-2">
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
                placeholder="Required for these controls"
                className="font-mono text-[13px]"
                aria-label="Demo key"
              />
            </label>
          )}
          <div className="flex items-center justify-between gap-3">
            <span>
              Issuer status: <strong>{failed.data === undefined ? "…" : failed.data ? "FAILED" : "OK"}</strong>
            </span>
            <Button variant={failed.data ? "secondary" : "danger"} size="sm" onClick={() => setFailed.mutate(!failed.data)} loading={setFailed.isPending} disabled={failed.data === undefined || (MODE === "chain" && !key.trim())}>
              {failed.data ? "Restore issuer" : "Simulate issuer failure"}
            </Button>
          </div>
          {setFailed.isError && <Notice tone="error">{errorMessage(setFailed.error)}</Notice>}
          {MODE === "chain" && (
            <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
              <span className="t-caption">Carry the latest Chainlink NAV and issuer status to the oracle now. Needs the demo key.</span>
              <Button variant="secondary" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => pushNav.mutate()} loading={pushNav.isPending} disabled={!key.trim()}>
                Refresh NAV
              </Button>
            </div>
          )}
          {pushNav.isError && <Notice tone="error">{errorMessage(pushNav.error)}</Notice>}
        </Panel>
      </div>
    </div>
  );
}
