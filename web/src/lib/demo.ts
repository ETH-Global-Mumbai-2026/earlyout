import { MODE } from "./addresses";

/// Mock mode only: add `?empty` to a screen's URL to see its lists empty, so
/// the empty states can be checked without a chain.
export function mockEmpty(): boolean {
  return MODE === "mock" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("empty");
}
