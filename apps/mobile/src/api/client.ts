// apps/mobile/src/api/client.ts
import { API_BASE } from "./config";

export type TokenGetter = () => Promise<string | null>;

// -----------------------------------------------
// Shared response types
// -----------------------------------------------

export interface ApiUser {
  id: string;
  displayName: string;
  defaultPlatform: "paypal" | "venmo" | "cashapp" | null;
}

export interface ApiBillParticipant {
  id: string;
  userId: string | null;
  contactName: string | null;
  platform: "paypal" | "venmo" | "cashapp";
  shareCents: number;
  paidCents: number;
  state: "pending" | "reminded" | "paid";
  paymentLink: string | null;
  settledAt: string | null;
  user: ApiUser | null;
}

export interface ApiBill {
  id: string;
  ownerId: string;
  name: string;
  location: string | null;
  totalCents: number;
  taxCents: number;
  tipCents: number;
  status: "open" | "settled" | "cancelled";
  createdAt: string;
  participants: ApiBillParticipant[];
}

export interface ApiFriend {
  id: string;
  requesterId: string;
  requester: ApiUser;
  recipientId: string;
  recipient: ApiUser;
  status: "pending" | "accepted";
}

export interface ApiLedgerEntry {
  tabId: string;
  delta: number;
  settled: boolean;
  createdAt: string;
}

export interface ApiLedgerPage {
  items: ApiLedgerEntry[];
  nextCursor: string | null;
}

export interface ApiPaymentHandle {
  platform: "paypal" | "venmo" | "cashapp";
  handle: string;
}

export interface ApiGroupMember {
  groupId: string;
  userId: string;
  joinedAt: string;
  user: ApiUser;
}

export interface ApiGroup {
  id: string;
  ownerId: string;
  name: string;
  avatarS3Key: string | null;
  createdAt: string;
  updatedAt: string;
  members: ApiGroupMember[];
}

// -----------------------------------------------
// Client factory
// -----------------------------------------------

async function request<T>(
  method: string,
  path: string,
  getToken: TokenGetter,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.message ?? message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function makeApiClient(getToken: TokenGetter) {
  return {
    get:   <T>(path: string) => request<T>("GET", path, getToken),
    post:  <T>(path: string, body?: unknown) => request<T>("POST", path, getToken, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, getToken, body),
    del:   <T>(path: string) => request<T>("DELETE", path, getToken),
  };
}

export type ApiClient = ReturnType<typeof makeApiClient>;
