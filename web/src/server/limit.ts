import "server-only";

/// Small in-memory guards for the public read routes. Per server instance,
/// which is enough to stop one client from turning our API into an RPC hose.

const hits = new Map<string, { windowStart: number; count: number }>();

/// At most `max` requests per `windowMs` per client IP.
export function allow(req: Request, max = 60, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.windowStart > windowMs) {
    hits.set(ip, { windowStart: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return true;
  }
  h.count += 1;
  return h.count <= max;
}
