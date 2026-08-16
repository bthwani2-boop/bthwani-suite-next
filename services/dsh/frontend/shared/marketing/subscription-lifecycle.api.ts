import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  SubscriptionActivationEnvelope,
  SubscriptionCancellationEnvelope,
  SubscriptionPaymentMethod,
  SubscriptionPurchaseEnvelope,
} from "./subscription-lifecycle.types";
import {
  clearSubscriptionMutationAttempt,
  getLatestSubscriptionPurchaseAttempt,
  getOrCreateSubscriptionMutationAttempt,
} from "./subscription-mutation-attempt";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "subscription-lifecycle");

async function mutationContext(
  operation: "purchase" | "activate" | "renew" | "cancel",
  subject: string,
  fingerprint: string,
  paymentMethod?: SubscriptionPaymentMethod,
) {
  const attempt = await getOrCreateSubscriptionMutationAttempt({
    operation,
    subject,
    fingerprint,
    ...(paymentMethod ? { paymentMethod } : {}),
  });
  return { attempt, ...attempt.context };
}

function purchaseIsTerminal(status: SubscriptionPurchaseEnvelope["purchase"]["status"]): boolean {
  return status === "active" || status === "renewed" || status === "cancelled" || status === "expired" || status === "compensated" || status === "failed";
}

export async function recoverDshSubscriptionPurchase() {
  const attempt = await getLatestSubscriptionPurchaseAttempt();
  if (!attempt || attempt.operation !== "purchase" || !attempt.paymentMethod) return undefined;
  const response = await request<SubscriptionPurchaseEnvelope>("/dsh/client/marketing/subscriptions/purchase", {
    method: "POST",
    body: { planId: attempt.subject, paymentMethod: attempt.paymentMethod },
    ...attempt.context,
  });
  if (purchaseIsTerminal(response.purchase.status)) {
    await clearSubscriptionMutationAttempt({ operation: "purchase", subject: attempt.subject, fingerprint: attempt.fingerprint });
  }
  return response;
}

export async function createDshSubscriptionPurchase(
  planId: string,
  paymentMethod: SubscriptionPaymentMethod,
): Promise<SubscriptionPurchaseEnvelope> {
  const fingerprint = `purchase:${planId}:${paymentMethod}`;
  const { attempt } = await mutationContext("purchase", planId, fingerprint, paymentMethod);
  const response = await request<SubscriptionPurchaseEnvelope>("/dsh/client/marketing/subscriptions/purchase", {
    method: "POST",
    body: { planId, paymentMethod },
    ...attempt.context,
  });
  if (purchaseIsTerminal(response.purchase.status)) {
    await clearSubscriptionMutationAttempt({ operation: "purchase", subject: planId, fingerprint });
  }
  return response;
}

export function getDshSubscriptionPurchase(purchaseId: string) {
  return request<SubscriptionPurchaseEnvelope>(
    `/dsh/client/marketing/subscriptions/purchases/${encodeURIComponent(purchaseId)}`,
  );
}

export async function activateDshSubscriptionPurchase(purchaseId: string): Promise<SubscriptionActivationEnvelope> {
  const fingerprint = `activate:${purchaseId}`;
  const { attempt } = await mutationContext("activate", purchaseId, fingerprint);
  const response = await request<SubscriptionActivationEnvelope>(
    `/dsh/client/marketing/subscriptions/purchases/${encodeURIComponent(purchaseId)}/activate`,
    {
      method: "POST",
      body: {},
      ...attempt.context,
    },
  );
  if (response.purchase.status === "active" || response.purchase.status === "renewed") {
    await clearSubscriptionMutationAttempt({ operation: "activate", subject: purchaseId, fingerprint });
  }
  return response;
}

export async function renewDshSubscription(
  subscriptionId: string,
  paymentMethod: SubscriptionPaymentMethod,
): Promise<SubscriptionPurchaseEnvelope> {
  const fingerprint = `renew:${subscriptionId}:${paymentMethod}`;
  const { attempt } = await mutationContext("renew", subscriptionId, fingerprint, paymentMethod);
  const response = await request<SubscriptionPurchaseEnvelope>(
    `/dsh/client/marketing/subscriptions/instances/${encodeURIComponent(subscriptionId)}/renew`,
    {
      method: "POST",
      body: { paymentMethod },
      ...attempt.context,
    },
  );
  if (purchaseIsTerminal(response.purchase.status)) {
    await clearSubscriptionMutationAttempt({ operation: "renew", subject: subscriptionId, fingerprint });
  }
  return response;
}

export async function cancelDshSubscription(subscriptionId: string, reason: string): Promise<SubscriptionCancellationEnvelope> {
  const normalizedReason = reason.trim();
  const fingerprint = `cancel:${subscriptionId}:${normalizedReason}`;
  const { attempt } = await mutationContext("cancel", subscriptionId, fingerprint);
  const response = await request<SubscriptionCancellationEnvelope>(
    `/dsh/client/marketing/subscriptions/instances/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      body: { reason: normalizedReason },
      ...attempt.context,
    },
  );
  await clearSubscriptionMutationAttempt({ operation: "cancel", subject: subscriptionId, fingerprint });
  return response;
}
