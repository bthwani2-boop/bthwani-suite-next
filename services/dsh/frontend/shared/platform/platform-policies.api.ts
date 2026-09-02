import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCaptainFinancialEligibility,
  DshCreateZoneInput,
  DshStoreOnboardingFeePolicy,
  DshStoreOnboardingFeePolicyInput,
  DshUpdateZoneInput,
  DshZone,
  DshZoneServiceability,
} from "./platform-policies.types";

const { request: req } = createDshHttpClient("/api/dsh", "platform-policy");

function stableMutationKey(scope: string, payload: unknown): string {
  const text = JSON.stringify(payload);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `platform:${scope}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export const fetchZones = (includeInactive = true) =>
  req<{ zones: DshZone[] }>(
    `/dsh/operator/platform/zones?includeInactive=${includeInactive ? "true" : "false"}`,
  );

export const createZone = (body: DshCreateZoneInput) =>
  req<{ zone: DshZone }>("/dsh/operator/platform/zones", {
    method: "POST",
    body,
    idempotencyKey: stableMutationKey("zone:create", body),
  });

export const updateZone = (id: string, body: DshUpdateZoneInput) =>
  req<{ zone: DshZone }>(`/dsh/operator/platform/zones/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    idempotencyKey: stableMutationKey(`zone:${id}:update`, body),
  });

export const fetchZoneServiceability = (zoneId: string) =>
  req<DshZoneServiceability>(
    `/dsh/operator/platform/serviceability/${encodeURIComponent(zoneId)}`,
  );

export const fetchStoreOnboardingFeePolicy = () =>
  req<{ policy: DshStoreOnboardingFeePolicy }>(
    "/dsh/operator/platform/store-onboarding-fee",
  );

export const upsertStoreOnboardingFeePolicy = (
  body: DshStoreOnboardingFeePolicyInput,
) =>
  req<{ policy: DshStoreOnboardingFeePolicy }>(
    "/dsh/operator/platform/store-onboarding-fee",
    {
      method: "PUT",
      body,
      idempotencyKey: stableMutationKey("store-onboarding-fee", body),
    },
  );

// Read-only reference for app-field / app-partner (never app-client).
export const fetchStoreOnboardingFeeReference = () =>
  req<{ policy: DshStoreOnboardingFeePolicy }>(
    "/dsh/platform/store-onboarding-fee",
  );

export const fetchOperatorCaptainFinancialEligibility = (captainId: string) =>
  req<{ financialEligibility: DshCaptainFinancialEligibility }>(
    `/dsh/operator/dispatch/captains/${encodeURIComponent(captainId)}/financial-eligibility`,
  );

export const refreshOperatorCaptainFinancialEligibility = (captainId: string) =>
  req<{ financialEligibility: DshCaptainFinancialEligibility }>(
    `/dsh/operator/dispatch/captains/${encodeURIComponent(captainId)}/financial-eligibility/refresh`,
    {
      method: "POST",
      idempotencyKey: stableMutationKey(`captain:${captainId}:financial-eligibility`, { captainId }),
    },
  );
