import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshCapacityConfig,
  DshCreateZoneInput,
  DshSlaRule,
  DshStoreOnboardingFeePolicy,
  DshStoreOnboardingFeePolicyInput,
  DshUpsertCapacityInput,
  DshUpsertSlaRuleInput,
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

export const fetchSlaRules = (zoneId?: string) =>
  req<{ slaRules: DshSlaRule[] }>(
    `/dsh/operator/platform/sla-rules${zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ""}`,
  );

export const upsertSlaRule = (body: DshUpsertSlaRuleInput) =>
  req<{ slaRule: DshSlaRule }>("/dsh/operator/platform/sla-rules", {
    method: "PUT",
    body,
    idempotencyKey: stableMutationKey(`sla:${body.zoneId}:${body.category}`, body),
  });

export const fetchCapacityConfig = (zoneId: string) =>
  req<{ capacityConfig: DshCapacityConfig }>(
    `/dsh/operator/platform/capacity?zoneId=${encodeURIComponent(zoneId)}`,
  );

export const upsertCapacityConfig = (body: DshUpsertCapacityInput) =>
  req<{ capacityConfig: DshCapacityConfig }>("/dsh/operator/platform/capacity", {
    method: "PUT",
    body,
    idempotencyKey: stableMutationKey(`capacity:${body.zoneId}`, body),
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
