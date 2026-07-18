import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshClientAddressAnonymizationResult,
  DshClientAddressPrivacyPolicy,
  DshUpdateClientAddressPrivacyPolicyInput,
} from "./client-address-privacy.types";

const { request } = createDshHttpClient(
  "/api/dsh",
  "client-address-privacy",
);

function stablePrivacyKey(scope: string, payload: unknown): string {
  const text = JSON.stringify(payload);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `privacy:${scope}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export async function fetchClientAddressPrivacyPolicy(): Promise<DshClientAddressPrivacyPolicy> {
  const result = await request<{ policy: DshClientAddressPrivacyPolicy }>(
    "/dsh/operator/privacy/client-addresses/policy",
  );
  return result.policy;
}

export async function updateClientAddressPrivacyPolicy(
  input: DshUpdateClientAddressPrivacyPolicyInput,
): Promise<DshClientAddressPrivacyPolicy> {
  const result = await request<{ policy: DshClientAddressPrivacyPolicy }>(
    "/dsh/operator/privacy/client-addresses/policy",
    {
      method: "PUT",
      body: input,
      idempotencyKey: stablePrivacyKey("policy", input),
    },
  );
  return result.policy;
}

export async function anonymizeExpiredClientAddresses(
  limit: number,
): Promise<DshClientAddressAnonymizationResult> {
  const body = { limit };
  const result = await request<{
    result: DshClientAddressAnonymizationResult;
  }>("/dsh/operator/privacy/client-addresses/anonymize", {
    method: "POST",
    body,
    idempotencyKey: stablePrivacyKey("anonymize", body),
  });
  return result.result;
}
