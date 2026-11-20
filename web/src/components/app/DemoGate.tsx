"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Sheet } from "../ui/primitives";
import { demoKey, setDemoKey } from "@/hooks/useEarlyout";
import { MODE } from "@/lib/addresses";
import { TESTNET } from "@/lib/site";

const CHANGE = "earlyout:operator-key";
const OPEN = "earlyout:operator-open";

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
}

/// Operator mode: demo controls (simulate an issuer failure, push prices)
/// show only on testnet, after the operator enters the demo key. In mock
/// mode any key unlocks them.
export function useOperator() {
  const key = useSyncExternalStore(subscribe, demoKey, () => "");
  const enabled = TESTNET && key.length > 0 && (MODE === "mock" || key !== "mock");
  return {
    enabled,
    unlock(k: string) {
      setDemoKey(k);
      window.dispatchEvent(new Event(CHANGE));
    },
    lock() {
      setDemoKey("");
      window.dispatchEvent(new Event(CHANGE));
    },
  };
}

/// Opens the operator dialog from anywhere (the sidebar's Operator link).
export function openOperatorDialog() {
  window.dispatchEvent(new Event(OPEN));
}

/// The key dialog. Mounted once in the app shell; opens on `?operator` in the
/// URL or when `openOperatorDialog()` is called.
export function OperatorDialog() {
  const op = useOperator();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN, show);
    if (new URLSearchParams(window.location.search).has("operator")) queueMicrotask(show);
    return () => window.removeEventListener(OPEN, show);
  }, []);

  if (!TESTNET) return null;
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Operator">
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          op.unlock(value.trim());
          setValue("");
          setOpen(false);
        }}
      >
        <p className="text-[14px] text-ink-2">Demo controls are for the Earlyout team on testnet. Enter the operator key to show them.</p>
        <label className="grid gap-1.5">
          <span className="t-label">Operator key</span>
          <input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 rounded-[6px] border border-line-strong bg-surface px-3 font-mono text-[14px]"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          {op.enabled ? (
            <button type="button" className="text-[13px] text-ink underline underline-offset-4" onClick={() => op.lock()}>
              Lock demo controls
            </button>
          ) : (
            <span />
          )}
          <Button type="submit">Unlock</Button>
        </div>
      </form>
    </Sheet>
  );
}
