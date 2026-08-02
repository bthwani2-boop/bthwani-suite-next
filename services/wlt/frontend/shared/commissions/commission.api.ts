import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { createDshHttpClient } from "../dsh-link/dsh-http-request";

export type RepresentativeActorType = "partner" | "captain" | "field";
export type CommissionStatus =
  | "pending"
  | "confirmed"
  | "settled"
  | "rejected"
  | "reversed"
  | string;

export type Commission = {
  readonly id: string;
  readonly beneficiaryActorId: string;
  readonly beneficiaryActorType: RepresentativeActorType | string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly visitId: string | null;
  readonly storeId: string | null;
  readonly commissionPolicyId: string | null;
  readonly commissionType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: CommissionStatus;
  readonly settledAt: string | null;
  readonly confirmedAt: string | null;
  readonly rejectedAt: string | null;
  readonly reversedAt: string | null;
  readonly resolutionNote: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CommissionEvidence = {
  readonly policyId: string;
  readonly policyVersion: number;
  readonly sourceEvidenceId: string;
  readonly sourceEvidenceHash: string;
  readonly sourceEvidenceStatus: "completed" | "delivered" | "approved" | string;
  readonly grossBasisMinorUnits: number;
  readonly calculatedAmountMinorUnits: number;
  readonly verifiedAt: string;
};

export type CommissionAdjustment = {
  readonly id: string;
  readonly deltaMinorUnits: number;
  readonly reason: string;
  readonly operatorId: string;
  readonly createdAt: string;
};

export type CommissionDetail = {
  readonly commission: Commission;
  readonly evidence?: CommissionEvidence;
  readonly adjustments: readonly CommissionAdjustment[];
};

export type SettlementEvidence = {
  readonly orderId: string;
  readonly pricingSnapshotHash: string;
  readonly completionEventId: string;
  readonly completionEvidenceHash: string;
  readonly cancellationStatus: "not_cancelled" | "cancelled" | string;
  readonly originalGrossMinorUnits: number;
  readonly completedRefundMinorUnits: number;
  readonly settlementBasisMinorUnits: number;
  readonly refundEvidenceCount: number;
  readonly verifiedAt: string;
};

export type CommissionPolicyInput = {
  readonly policyId: string;
  readonly commissionType: string;
  readonly sourceType: string;
  readonly beneficiaryActorType: RepresentativeActorType;
  readonly calculationType: "fixed" | "basis_points";
  readonly fixedAmountMinorUnits: number;
  readonly basisPoints: number;
  readonly minimumAmountMinorUnits: number;
  readonly maximumAmountMinorUnits?: number | null;
  readonly currency: string;
  readonly status: "active" | "inactive";
  readonly changeReason: string;
};

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
