import "server-only";
import { randomUUID } from "node:crypto";

/// Circle Wallets (user-controlled) over Circle's REST API. The API key stays
/// on the server; the browser only ever holds a short-lived user token, and
/// every transaction is confirmed by the user with their PIN inside Circle's
/// own frame. Wallets are smart contract accounts on Arc testnet, so Circle's
/// Gas Station can sponsor their gas.

const API = "https://api.circle.com/v1/w3s";
export const CIRCLE_BLOCKCHAIN = "ARC-TESTNET";

export class CircleError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly status?: number,
  ) {
    super(message);
  }
}

export function circleConfigured() {
  return !!process.env.CIRCLE_API_KEY;
}

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; userToken?: string } = {}): Promise<T> {
  const key = process.env.CIRCLE_API_KEY;
  if (!key) throw new CircleError("Circle wallets are not set up");
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.userToken ? { "x-user-token": init.userToken } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; code?: number; message?: string };
  if (!res.ok) throw new CircleError(json.message ?? `Circle request failed (${res.status})`, json.code, res.status);
  return json.data as T;
}

export type CircleWallet = { id: string; address: string; blockchain: string; accountType: string; state: string };

/// Circle error codes we handle on purpose.
const USER_EXISTS = 155101;
const ALREADY_INITIALIZED = 155106;

/// Creates the user if new, issues a user token, and returns the Arc wallet
/// or, the first time, the challenge that sets the PIN and creates it.
export async function openSession(userId: string) {
  try {
    await call("/users", { method: "POST", body: { userId } });
  } catch (e) {
    if (!(e instanceof CircleError && e.code === USER_EXISTS)) throw e;
  }
  const { userToken, encryptionKey } = await call<{ userToken: string; encryptionKey: string }>("/users/token", {
    method: "POST",
    body: { userId },
  });
  const wallet = await arcWallet(userToken);
  if (wallet) return { userToken, encryptionKey, wallet };
  try {
    const { challengeId } = await call<{ challengeId: string }>("/user/initialize", {
      method: "POST",
      userToken,
      body: { idempotencyKey: randomUUID(), accountType: "SCA", blockchains: [CIRCLE_BLOCKCHAIN] },
    });
    return { userToken, encryptionKey, challengeId };
  } catch (e) {
    // PIN already set but no Arc wallet yet (for example the first challenge was closed): create the wallet.
    if (!(e instanceof CircleError && e.code === ALREADY_INITIALIZED)) throw e;
    const { challengeId } = await call<{ challengeId: string }>("/user/wallets", {
      method: "POST",
      userToken,
      body: { idempotencyKey: randomUUID(), accountType: "SCA", blockchains: [CIRCLE_BLOCKCHAIN] },
    });
    return { userToken, encryptionKey, challengeId };
  }
}

export async function arcWallet(userToken: string): Promise<CircleWallet | undefined> {
  const { wallets } = await call<{ wallets: CircleWallet[] }>(`/wallets?blockchain=${CIRCLE_BLOCKCHAIN}`, { userToken });
  return wallets.find((w) => w.state === "LIVE") ?? wallets[0];
}

/// Asks Circle to prepare a contract call from the user's wallet. The user
/// approves it with their PIN through the returned challenge.
export async function contractExecution(v: {
  userToken: string;
  walletId: string;
  contractAddress: string;
  abiFunctionSignature: string;
  abiParameters: (string | boolean | string[])[];
}): Promise<{ challengeId: string; refId: string }> {
  // A reference of our own, so the transaction can be found again without
  // guessing from "the newest one" (an incoming transfer could be newer).
  const refId = randomUUID();
  const r = await call<{ challengeId: string }>("/user/transactions/contractExecution", {
    method: "POST",
    userToken: v.userToken,
    body: {
      idempotencyKey: randomUUID(),
      walletId: v.walletId,
      contractAddress: v.contractAddress,
      abiFunctionSignature: v.abiFunctionSignature,
      abiParameters: v.abiParameters,
      feeLevel: "MEDIUM",
      refId,
    },
  });
  return { challengeId: r.challengeId, refId };
}

export type CircleTx = { id: string; state: string; txHash?: string; errorReason?: string; refId?: string; createDate: string };

/// The wallet's outbound transaction carrying our `refId`, once Circle has created it.
export async function transactionByRef(userToken: string, walletId: string, refId: string): Promise<CircleTx | undefined> {
  const { transactions } = await call<{ transactions: CircleTx[] }>(
    `/transactions?walletIds=${encodeURIComponent(walletId)}&blockchain=${CIRCLE_BLOCKCHAIN}&txType=OUTBOUND&pageSize=20&order=DESC`,
    { userToken },
  );
  return transactions.find((t) => t.refId === refId);
}
