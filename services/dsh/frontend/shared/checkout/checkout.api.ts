import { configureIdentitySession, getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { DshCheckoutIntent, DshCreateIntentInput } from "./checkout.types";

const baseUrl = resolveDshApiBaseUrl();
configureIdentitySession(resolveIdentityApiBaseUrl());

async function request<T>(
  path: string,
  options: { readonly method?: "GET" | "POST" | "DELETE"; readonly body?: unknown } = {},
): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": corrId("checkout"),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function createCheckoutIntent(
  input: DshCreateIntentInput,
): Promise<DshCheckoutIntent> {
  const data = await request<{ intent: DshCheckoutIntent }>("/dsh/client/checkout-intents", {
    method: "POST",
    body: input,
  });
  return data.intent;
}

export async function fetchCheckoutIntent(intentId: string): Promise<DshCheckoutIntent> {
  const data = await request<{ intent: DshCheckoutIntent }>(
    `/dsh/client/checkout-intents/${encodeURIComponent(intentId)}`,
  );
  return data.intent;
}

export async function cancelCheckoutIntent(intentId: string): Promise<DshCheckoutIntent> {
  const data = await request<{ intent: DshCheckoutIntent }>(
    `/dsh/client/checkout-intents/${encodeURIComponent(intentId)}/cancel`,
    { method: "POST" },
  );
  return data.intent;
}

export async function fetchOperatorCheckoutIntents(
  stateFilter?: string,
): Promise<readonly DshCheckoutIntent[]> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const params = stateFilter ? `?state=${encodeURIComponent(stateFilter)}` : "";
  let response: Response;
  try {
    response = await fetch(new URL(`/dsh/operator/checkout-intents${params}`, baseUrl), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) throw { kind: "http", status: response.status };
  const data = (await response.json()) as { intents: DshCheckoutIntent[] };
  return data.intents ?? [];
}

export function classifyCheckoutError(
  error: unknown,
): { kind: "permission_denied" | "conflict" | "offline" | "error"; message?: string } {
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return { kind: "permission_denied" };
  }
  if (typed.kind === "http" && typed.status === 409) {
    return { kind: "conflict" };
  }
  if (typed.kind === "network") {
    return { kind: "offline" };
  }
  return { kind: "error", message: "تعذر تنفيذ عملية الدفع." };
}

function corrId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function resolveIdentityApiBaseUrl(): string {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    const configured =
      env["NEXT_PUBLIC_IDENTITY_API_BASE_URL"] ??
      env["EXPO_PUBLIC_IDENTITY_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }
  return "http://localhost:58081";
}
