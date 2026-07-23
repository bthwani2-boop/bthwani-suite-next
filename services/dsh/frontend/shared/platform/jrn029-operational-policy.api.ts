import { createDshHttpClient } from "../_kernel/dsh-http-request";

export type DshFulfillmentMode =
  | "bthwani_delivery"
  | "partner_delivery"
  | "client_pickup";

export type DshOperationalSla = {
  readonly configured: boolean;
  readonly ruleId?: string;
  readonly category?: string;
  readonly maxPrepMins?: number;
  readonly maxAssignmentMins?: number;
  readonly maxDeliveryMins?: number;
  readonly version?: number;
};

export type DshOperationalCapacity = {
  readonly configured: boolean;
  readonly configId?: string;
  readonly maxConcurrentOrders?: number;
  readonly maxCaptainsOnline?: number;
  readonly throttleThreshold?: number;
  readonly isPaused: boolean;
  readonly pauseReason?: string;
  readonly version?: number;
};

export type DshOperationalProfile = {
  readonly zoneId: string;
  readonly sla: DshOperationalSla;
  readonly capacity: DshOperationalCapacity;
};

export type DshDeliveryModePolicy = {
  readonly id: string;
  readonly zoneId: string;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly isEnabled: boolean;
  readonly slaCategory: string;
  readonly version: number;
  readonly updatedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshOperationalEffects = {
  readonly cartAllowed: boolean;
  readonly checkoutAllowed: boolean;
  readonly orderCreationAllowed: boolean;
  readonly dispatchAllowed: boolean;
  readonly partnerHandoffRequired: boolean;
  readonly clientPickupRequired: boolean;
};

export type DshOperationalDecision = {
  readonly zoneId: string;
  readonly serviceAreaCode: string;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly decision:
    | "serviceable"
    | "unserviceable"
    | "policy_incomplete"
    | "paused"
    | "mode_disabled"
    | "capacity_exhausted"
    | "throttled";
  readonly serviceable: boolean;
  readonly reasonCodes: readonly string[];
  readonly allowedActions: readonly string[];
  readonly activeStores: number;
  readonly pressureRatio: number;
  readonly sla: DshOperationalSla;
  readonly capacity: DshOperationalCapacity;
  readonly modePolicy?: DshDeliveryModePolicy;
  readonly effects: DshOperationalEffects;
  readonly policyVersions: Readonly<Record<string, number>>;
  readonly evaluatedAt: string;
};

export type DshOperationalPolicyAuditEvent = {
  readonly id: string;
  readonly aggregateType:
    | "zone"
    | "sla_rule"
    | "capacity_config"
    | "delivery_mode"
    | "store_onboarding_fee";
  readonly aggregateId: string;
  readonly action: "created" | "updated" | "activated" | "deactivated" | "rolled_back";
  readonly actorId: string;
  readonly actorSurface: string;
  readonly correlationId?: string;
  readonly reason: string;
  readonly fromVersion?: number;
  readonly toVersion: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

export type DshUpsertOperationalProfileInput = {
  readonly slaCategory: string;
  readonly maxPrepMins: number;
  readonly maxAssignmentMins: number;
  readonly maxDeliveryMins: number;
  readonly expectedSlaVersion: number;
  readonly maxConcurrentOrders: number;
  readonly maxCaptainsOnline: number;
  readonly throttleThreshold: number;
  readonly isPaused: boolean;
  readonly pauseReason: string;
  readonly expectedCapacityVersion: number;
  readonly reason: string;
};

export type DshOperationalEvaluationInput = {
  readonly zoneId: string;
  readonly serviceAreaCode?: string | undefined;
  readonly fulfillmentMode: DshFulfillmentMode;
  readonly slaCategory?: string | undefined;
  readonly activeOrders: number;
  readonly captainsOnline: number;
};

const { request } = createDshHttpClient("/api/dsh", "jrn-029-operational-policy");

function mutationKey(scope: string, payload: unknown): string {
  const text = JSON.stringify(payload);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `jrn029:${scope}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export const fetchDshOperationalProfile = (zoneId: string, category = "default") =>
  request<{ profile: DshOperationalProfile }>(
    `/dsh/operator/platform/operational-profiles/${encodeURIComponent(zoneId)}?category=${encodeURIComponent(category)}`,
  );

export const upsertDshOperationalProfile = (
  zoneId: string,
  body: DshUpsertOperationalProfileInput,
) =>
  request<{ profile: DshOperationalProfile }>(
    `/dsh/operator/platform/operational-profiles/${encodeURIComponent(zoneId)}`,
    {
      method: "PUT",
      body,
      idempotencyKey: mutationKey(`profile:${zoneId}`, body),
    },
  );

export const fetchDshOperationalDeliveryModes = (zoneId: string) =>
  request<{ deliveryModes: DshDeliveryModePolicy[] }>(
    `/dsh/operator/platform/operational-profiles/${encodeURIComponent(zoneId)}/delivery-modes`,
  );

export const upsertDshOperationalDeliveryMode = (
  zoneId: string,
  fulfillmentMode: DshFulfillmentMode,
  body: {
    readonly isEnabled: boolean;
    readonly slaCategory: string;
    readonly expectedVersion: number;
    readonly reason: string;
  },
) =>
  request<{ deliveryMode: DshDeliveryModePolicy }>(
    `/dsh/operator/platform/operational-profiles/${encodeURIComponent(zoneId)}/delivery-modes/${fulfillmentMode}`,
    {
      method: "PUT",
      body,
      idempotencyKey: mutationKey(`mode:${zoneId}:${fulfillmentMode}`, body),
    },
  );

export const evaluateDshOperationalPolicy = (body: DshOperationalEvaluationInput) =>
  request<{ decision: DshOperationalDecision }>(
    "/dsh/platform/operational-policy/evaluate",
    { method: "POST", body },
  );

export const fetchDshOperationalPolicyAudit = (filters?: {
  readonly aggregateType?: string;
  readonly aggregateId?: string;
  readonly limit?: number;
}) => {
  const query = new URLSearchParams();
  if (filters?.aggregateType) query.set("aggregateType", filters.aggregateType);
  if (filters?.aggregateId) query.set("aggregateId", filters.aggregateId);
  if (filters?.limit) query.set("limit", String(filters.limit));
  const suffix = query.toString();
  return request<{ events: DshOperationalPolicyAuditEvent[] }>(
    `/dsh/operator/platform/operational-policy/audit${suffix ? `?${suffix}` : ""}`,
  );
};

export const rollbackDshOperationalPolicy = (
  eventId: string,
  body: { readonly expectedCurrentVersion: number; readonly reason: string },
) =>
  request<{
    rollback: {
      readonly targetEventId: string;
      readonly aggregateType: string;
      readonly aggregateId: string;
      readonly fromVersion: number;
      readonly toVersion: number;
    };
  }>(
    `/dsh/operator/platform/operational-policy/audit/${encodeURIComponent(eventId)}/rollback`,
    {
      method: "POST",
      body,
      idempotencyKey: mutationKey(`rollback:${eventId}`, body),
    },
  );
