import type { components } from "../../../../clients/generated/wlt-api";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { createDshHttpClient } from "../dsh-link/dsh-http-request";

import type { RepresentativeActorType } from "../actor-wallet/actor-wallet.api";
export type { RepresentativeActorType };

/** WLT-owned aliases generated from the canonical OpenAPI bundle. */
export type CommissionStatus = components["schemas"]["CommissionStatus"];
export type Commission = components["schemas"]["Commission"];
export type CommissionDetail = components["schemas"]["CommissionDetail"];
export type CommissionEvidence = NonNullable<CommissionDetail["evidence"]>;
export type CommissionAdjustment = CommissionDetail["adjustments"][number];
export type SettlementEvidence = components["schemas"]["SettlementEvidence"];

/**
 * DSH facade input. Operator identity is resolved by the authenticated backend
 * and is intentionally omitted from the direct WLT request contract.
 */
export type CommissionPolicyInput = Omit<
  components["schemas"]["CommissionPolicyInput"],
  "operatorId"
>;

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-settlements-commissions",
);

const ownCommissionPath = (actorType: RepresentativeActorType): string =>
  `/dsh/${actorType}/me/finance/commissions`;

function commissionActionPath(
  commissionId: string,
  action: "adjust" | "confirm" | "settle" | "reject" | "reverse",
): string {
  const encodedId = encodeURIComponent(commissionId);
  switch (action) {
    case "adjust":
      return `/dsh/control-panel/finance/commissions/${encodedId}/adjust`;
    case "confirm":
      return `/dsh/control-panel/finance/commissions/${encodedId}/confirm`;
    case "settle":
      return `/dsh/control-panel/finance/commissions/${encodedId}/settle`;
    case "reject":
      return `/dsh/control-panel/finance/commissions/${encodedId}/reject`;
    case "reverse":
      return `/dsh/control-panel/finance/commissions/${encodedId}/reverse`;
  }
}

function newAdjustmentIdempotencyKey(commissionId: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `commission-adjustment:${commissionId}:${uuid}`;
  return `commission-adjustment:${commissionId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export async function fetchOwnCommissions(
  actorType: RepresentativeActorType,
): Promise<readonly Commission[]> {
  const response = await request<{ readonly commissions: Commission[] }>(
    ownCommissionPath(actorType),
  );
  return response.commissions ?? [];
}

export async function fetchCommissionDetail(
  commissionId: string,
): Promise<CommissionDetail> {
  return request<CommissionDetail>(
    `/dsh/control-panel/finance/commissions/${encodeURIComponent(commissionId)}`,
  );
}

export async function fetchSettlementEvidence(
  settlementId: string,
): Promise<readonly SettlementEvidence[]> {
  const response = await request<{ readonly evidence: SettlementEvidence[] }>(
    `/dsh/control-panel/finance/settlements/${encodeURIComponent(settlementId)}/evidence`,
  );
  return response.evidence ?? [];
}

export async function upsertCommissionPolicy(
  input: CommissionPolicyInput,
): Promise<unknown> {
  return request("/dsh/control-panel/finance/commission-policies", {
    method: "PUT",
    body: input,
  });
}

async function commissionAction(
  commissionId: string,
  action: "adjust" | "confirm" | "settle" | "reject" | "reverse",
  body: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<Commission> {
  const response = await request<{ readonly commission: Commission }>(
    commissionActionPath(commissionId, action),
    {
      method: "POST",
      body,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  );
  return response.commission;
}

export const adjustCommission = (
  commissionId: string,
  deltaMinorUnits: number,
  reason: string,
) => {
  const idempotencyKey = newAdjustmentIdempotencyKey(commissionId);
  return commissionAction(
    commissionId,
    "adjust",
    { deltaMinorUnits, reason, idempotencyKey },
    idempotencyKey,
  );
};

export const confirmCommission = (commissionId: string) =>
  commissionAction(commissionId, "confirm", {});

export const settleCommission = (commissionId: string) =>
  commissionAction(commissionId, "settle", {});

export const rejectCommission = (commissionId: string, reason: string) =>
  commissionAction(commissionId, "reject", { reason });

export const reverseCommission = (commissionId: string, reason: string) =>
  commissionAction(commissionId, "reverse", { reason });
