// Incremental log scanning for wallet history read straight from Arc.
// Relative imports only, so the unit tests can load it under plain Node.

export type FetchLogs<T> = (fromBlock: bigint, toBlock: bigint) => Promise<T[]>;

/// Splits [from, head] into chunks of at most `step` blocks.
export function blockRanges(from: bigint, head: bigint, step: bigint): [bigint, bigint][] {
  const out: [bigint, bigint][] = [];
  for (let a = from; a <= head; a += step) out.push([a, a + step - 1n < head ? a + step - 1n : head]);
  return out;
}

/// A scanner that remembers, per key (a wallet), the logs found so far and the
/// last block it read. A repeat call reads only the blocks after that, so a
/// wallet costs one full scan per server instance and then a few blocks per
/// visit. Calls for the same key while one is running share it. A failed scan
/// leaves the memory as it was, so the next call retries the same blocks.
/// Only the `maxKeys` most recently used keys are kept.
export function createScanner<T>({ start, step, inFlight, maxKeys }: { start: bigint; step: bigint; inFlight: number; maxKeys: number }) {
  const memo = new Map<string, { to: bigint; logs: T[] }>();
  const running = new Map<string, Promise<T[]>>();

  function remember(key: string, entry: { to: bigint; logs: T[] }) {
    memo.delete(key);
    memo.set(key, entry);
    while (memo.size > maxKeys) memo.delete(memo.keys().next().value as string);
  }

  return function scan(key: string, head: bigint, fetch: FetchLogs<T>): Promise<T[]> {
    const busy = running.get(key);
    if (busy) return busy;
    const prev = memo.get(key);
    const from = prev ? prev.to + 1n : start;
    if (from > head) {
      if (prev) remember(key, prev);
      return Promise.resolve(prev?.logs ?? []);
    }
    const job = (async () => {
      const chunks = blockRanges(from, head, step);
      const found: T[] = [];
      for (let i = 0; i < chunks.length; i += inFlight) {
        const batch = await Promise.all(chunks.slice(i, i + inFlight).map(([a, b]) => fetch(a, b)));
        for (const logs of batch) found.push(...logs);
      }
      const logs = [...(prev?.logs ?? []), ...found];
      remember(key, { to: head, logs });
      return logs;
    })().finally(() => running.delete(key));
    running.set(key, job);
    return job;
  };
}
