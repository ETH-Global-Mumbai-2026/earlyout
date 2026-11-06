/// JSON with bigints: the API routes write bigints as "123n" and the client reads them back.
export function toWire(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? `${v}n` : v));
}

export function fromWire<T>(text: string): T {
  return JSON.parse(text, (_k, v) => (typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v)) as T;
}
