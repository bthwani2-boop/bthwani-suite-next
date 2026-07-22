import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  SubscriptionActivationEnvelope,
  SubscriptionCancellationEnvelope,
  SubscriptionPaymentMethod,
  SubscriptionPurchaseEnvelope,
} from "./subscription-lifecycle.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "jrn027");

let mutationSequence = 0;

function mutationIdentity(action: string, subject: string) {
  mutationSequence += 1;
  const seed = `${action}-${subject}-${Date.now().toString(36)}-${mutationSequence.toString(36)}`;
  return {
    idempotencyKey: seed,
    correlationId: corrId(`jrn027-${action}`),
  };
}

export function createDshSubscriptionPurchase(
  planId: string,
  paymentMethod: SubscriptionPaymentMethod = "official_wallet",
) {
  return request<SubscriptionPurchaseEnvelope>("/dsh/client/marketing/subscriptions/purchase", {
    method: "POST",
    body: { planId, paymentMethod },
    ...mutationIdentity("purchase", planId),
  });
}

export function getDshSubscriptionPurchase(purchaseId: string) {
  return request<SubscriptionPurchaseEnvelope>(
    `/dsh/client/marketing/subscriptions/purchases/${encodeURIComponent(purchaseId)}`,
  );
}

export function activateDshSubscriptionPurchase(purchaseId: string) {
  return request<SubscriptionActivationEnvelope>(
    `/dsh/client/marketing/subscriptions/${encodeURIComponent(purchaseId)}/activate`,
    {
      method: "POST",
      body: {},
      ...mutationIdentity("activate", purchaseId),
    },
  );
}

export function renewDshSubscription(
  subscriptionId: string,
  paymentMethod: SubscriptionPaymentMethod = "official_wallet",
) {
  return request<SubscriptionPurchaseEnvelope>(
    `/dsh/client/marketing/subscriptions/${encodeURIComponent(subscriptionId)}/renew`,
    {
      method: "POST",
      body: { paymentMethod },
      ...mutationIdentity("renew", subscriptionId),
    },
  );
}

export function cancelDshSubscription(subscriptionId: string, reason: string) {
  return request<SubscriptionCancellationEnvelope>(
    `/dsh/client/marketing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: "POST",
      body: { reason: reason.trim() },
      ...mutationIdentity("cancel", subscriptionId),
    },
  );
}
