import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshClientAddressAnonymizationResult,
  DshClientAddressPrivacyAuditEvent,
  DshClientAddressPrivacyPolicy,
  DshClientAddressPrivacyQueueStatus,
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

function normalizeRunId(runId: string): string {
  const normalized = runId.trim();
  if (normalized.length < 8 || normalized.length > 160) {
    throw { kind: "invalid_request", message: "runId must contain 8 to 160 characters" };
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) {
    throw { kind: "invalid_request", message: "runId contains unsupported characters" };
  }
  return normalized;
}

export async function fetchClientAddressPrivacyPolicy(): Promise<DshClientAddressPrivacyPolicy> {
  const result = await request<{ policy: DshClientAddressPrivacyPolicy }>(
    "/dsh/operator/privacy/client-addresses/policy",
  );
  return result.policy;
}

export async function fetchClientAddressPrivacyStatus(): Promise<DshClientAddressPrivacyQueueStatus> {
  const result = await request<{ status: DshClientAddressPrivacyQueueStatus }>(
    "/dsh/operator/privacy/client-addresses/status",
  );
  return result.status;
}

export async function fetchClientAddressPrivacyEvents(
  limit = 50,
): Promise<readonly DshClientAddressPrivacyAuditEvent[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw { kind: "invalid_request", message: "privacy event limit must be between 1 and 200" };
  }
  const result = await request<{ events: DshClientAddressPrivacyAuditEvent[] }>(
    `/dsh/operator/privacy/client-addresses/events?limit=${limit}`,
  );
  return result.events;
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
  runId: string,
): Promise<{
  readonly result: DshClientAddressAnonymizationResult;
  readonly status: DshClientAddressPrivacyQueueStatus;
}> {
  const normalizedRunId = normalizeRunId(runId);
  const body = { limit };
  return request<{
    result: DshClientAddressAnonymizationResult;
    status: DshClientAddressPrivacyQueueStatus;
  }>("/dsh/operator/privacy/client-addresses/anonymize", {
    method: "POST",
    body,
    idempotencyKey: `privacy-anonymize:${normalizedRunId}`,
    correlationId: normalizedRunId,
  });
}
