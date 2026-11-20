"use client";

import type { Abi, Address, Hex } from "viem";
import { toCircleCall } from "../circleCall";

/// The browser half of Circle Wallets. A Circle user id lives in this browser;
/// the server trades it for a short-lived user token. Every write is a Circle
/// challenge the user approves with their PIN in Circle's frame, and the
/// smart account's gas is paid through Circle's Gas Station.

type Session = { userToken: string; encryptionKey: string; walletId: string; address: Address };
export type CircleState = { status: "off" } | { status: "signing-in" } | ({ status: "ready" } & Session) | { status: "error"; error: string };

const USER_KEY = "earlyout.circleUserId";
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;

export const circleAvailable = !!APP_ID;

let state: CircleState = { status: "off" };
const listeners = new Set<() => void>();
function set(next: CircleState) {
  state = next;
  listeners.forEach((l) => l());
}
export const circleStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function circleAccount(): Address | undefined {
  return state.status === "ready" ? state.address : undefined;
}

type Sdk = { setAuthentication(a: { userToken: string; encryptionKey: string }): void; execute(id: string, cb: (err: unknown, res: unknown) => void): void };
let sdk: Sdk | undefined;

async function getSdk(): Promise<Sdk> {
  if (sdk) return sdk;
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
  sdk = new W3SSdk({ appSettings: { appId: APP_ID! } }) as unknown as Sdk;
  return sdk;
}

function userId(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem(USER_KEY);
  } catch {}
  if (!id) {
    id = crypto.randomUUID();
    try {
      localStorage.setItem(USER_KEY, id);
    } catch {}
  }
  return id;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Circle request failed");
  return json as T;
}

/// Runs one PIN challenge in Circle's frame.
async function runChallenge(s: { userToken: string; encryptionKey: string }, challengeId: string): Promise<void> {
  const k = await getSdk();
  k.setAuthentication({ userToken: s.userToken, encryptionKey: s.encryptionKey });
  await new Promise<void>((resolve, reject) =>
    k.execute(challengeId, (err) => {
      if (err) reject(new Error((err as { message?: string }).message ?? "Cancelled in Circle"));
      else resolve();
    }),
  );
}

type SessionReply = { userToken: string; encryptionKey: string; wallet?: { id: string; address: Address }; challengeId?: string };

/// Sign in, setting a PIN and creating the Arc wallet the first time.
export async function signInWithCircle(): Promise<void> {
  if (!APP_ID) throw new Error("Circle wallets are not set up here");
  set({ status: "signing-in" });
  try {
    const id = userId();
    let r = await post<SessionReply>("/api/circle/session", { userId: id });
    if (!r.wallet && r.challengeId) {
      await runChallenge(r, r.challengeId);
      // Circle creates the wallet just after the PIN is set.
      for (let i = 0; i < 15 && !r.wallet; i++) {
        await new Promise((res) => setTimeout(res, 1_500));
        r = await post<SessionReply>("/api/circle/session", { userId: id });
      }
    }
    if (!r.wallet) throw new Error("Circle did not create the wallet. Try again.");
    set({ status: "ready", userToken: r.userToken, encryptionKey: r.encryptionKey, walletId: r.wallet.id, address: r.wallet.address });
  } catch (e) {
    set({ status: "error", error: e instanceof Error ? e.message : "Could not sign in with Circle" });
    throw e;
  }
}

export function signOutOfCircle() {
  set({ status: "off" });
}

type CircleTx = { id: string; state: string; txHash?: Hex; errorReason?: string };

/// Circle user tokens last about an hour. On an expired token, get a fresh one
/// for the same user and try once more.
async function withFreshToken<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  if (state.status !== "ready") throw new Error("Sign in with Circle first");
  try {
    return await fn(state);
  } catch (e) {
    if (!(e instanceof Error) || !/token/i.test(e.message)) throw e;
    const r = await post<SessionReply>("/api/circle/session", { userId: userId() });
    if (!r.wallet) throw e;
    const next: Session = { userToken: r.userToken, encryptionKey: r.encryptionKey, walletId: r.wallet.id, address: r.wallet.address };
    set({ status: "ready", ...next });
    return fn(next);
  }
}

/// Sends one contract call from the Circle wallet and waits for its Arc hash.
export async function circleWrite(call: { address: Address; abi: Abi; functionName: string; args: readonly unknown[] }): Promise<Hex> {
  const { s, refId } = await withFreshToken(async (s) => {
    const { challengeId, refId } = await post<{ challengeId: string; refId: string }>("/api/circle/execute", {
      userToken: s.userToken,
      walletId: s.walletId,
      contractAddress: call.address,
      ...toCircleCall(call.abi, call.functionName, call.args),
    });
    await runChallenge(s, challengeId);
    return { s, refId };
  });
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    await new Promise((r) => setTimeout(r, 1_500));
    const { tx } = await post<{ tx: CircleTx | null }>("/api/circle/tx", { userToken: s.userToken, walletId: s.walletId, refId });
    if (!tx) continue;
    if (["FAILED", "DENIED", "CANCELLED"].includes(tx.state)) throw new Error(tx.errorReason ? `Circle: ${tx.errorReason}` : "The transaction failed in Circle");
    if (tx.txHash && ["SENT", "CONFIRMED", "COMPLETE"].includes(tx.state)) return tx.txHash;
  }
  throw new Error("Still waiting for Circle to send the transaction. Check again shortly.");
}
