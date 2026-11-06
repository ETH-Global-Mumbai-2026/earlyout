"use client";

import { useEffect, useState } from "react";

/// Unix seconds, refreshed on an interval, so "x min ago" stays honest without
/// calling Date.now() during render.
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
