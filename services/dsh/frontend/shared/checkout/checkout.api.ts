import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { DshCheckoutMutationContext } from "./checkout-create-attempt";
import type { DshCheckoutIntent, DshCreateIntentInput } from "./checkout.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "checkout");

export async function createCheckoutIntent(
  input: DshCreateIntentInput,
  mutation: DshCheckoutMutationContext,
): Promise<DshCheckoutIntent> {
  const data = await request<{ intent: DshCheckoutIntent }>("/dsh/client/checkout-intents", {
    method: "POST",
    body: input,
    idempotencyKey: mutation.idempotencyKey,
    correlationId: mutation.correlationId,
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
  const params = stateFilter ? `?state=${encodeURIComponent(stateFilter)}` : "";
  const data = await request<{ intents: DshCheckoutIntent[] }>(`/dsh/operator/checkout-intents${params}`);
  return data.intents ?? [];
}

export function classifyCheckoutError(
  error: unknown,
): { kind: "permission_denied" | "conflict" | "offline" | "payment_unavailable" | "error"; message?: string } {
  const typed = error as { kind?: string; status?: number; message?: string };
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return { kind: "permission_denied" };
  }
  if (typed.kind === "http" && typed.status === 409) {
    return { kind: "conflict" };
  }
  if (typed.kind === "http" && typed.status === 503) {
    return { kind: "payment_unavailable" };
  }
  if (typed.kind === "network") {
    return { kind: "offline" };
  }
  return { kind: "error", message: "تعذر تنفيذ عملية الدفع." };
}
