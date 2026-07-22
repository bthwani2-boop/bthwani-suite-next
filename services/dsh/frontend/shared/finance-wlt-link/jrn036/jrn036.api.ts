import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";

export type Jrn036RepresentativeActorType = "partner" | "captain" | "field";
export type Jrn036CommissionStatus =
  | "pending"
  | "confirmed"
  | "settled"
  | "rejected"
  | "reversed"
  | string;

export type Jrn036Commission = {
  readonly id: string;
  readonly beneficiaryActorId: string;
  readonly beneficiaryActorType: Jrn036RepresentativeActorType | string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly visitId: string | null;
  readonly storeId: string | null;
  readonly commissionPolicyId: string | null;
  readonly commissionType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: Jrn036CommissionStatus;
  readonly settledAt: string | null;
  readonly confirmedAt: string | null;
  readonly rejectedAt: string | null;
  readonly reversedAt: string | null;
  readonly resolutionNote: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type Jrn036CommissionEvidence = {
  readonly policyId: string;
  readonly policyVersion: number;
  readonly sourceEvidenceId: string;
  readonly sourceEvidenceHash: string;
  readonly sourceEvidenceStatus: "completed" | "delivered" | "approved" | string;
  readonly grossBasisMinorUnits: number;
  readonly calculatedAmountMinorUnits: number;
  readonly verifiedAt: string;
};

export type Jrn036CommissionAdjustment = {
  readonly id: string;
  readonly deltaMinorUnits: number;
  readonly reason: string;
  readonly operatorId: string;
  readonly createdAt: string;
};

export type Jrn036CommissionDetail = {
  readonly commission: Jrn036Commission;
  readonly evidence?: Jrn036CommissionEvidence;
  readonly adjustments: readonly Jrn036CommissionAdjustment[];
};

export type Jrn036SettlementEvidence = {
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

export type Jrn036CommissionPolicyInput = {
  readonly policyId: string;
  readonly commissionType: string;
  readonly sourceType: string;
  readonly beneficiaryActorType: Jrn036RepresentativeActorType;
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
  "dsh-jrn036-settlements-commissions",
);

function ownCommissionPath(actorType: Jrn036RepresentativeActorType): string {
  return `/dsh/${actorType}/me/finance/commissions`;
}

export async function fetchOwnJrn036Commissions(
  actorType: Jrn036RepresentativeActorType,
): Promise<readonly Jrn036Commission[]> {
  const response = await request<{ readonly commissions: Jrn036Commission[] }>(
    ownCommissionPath(actorType),
  );
  return response.commissions ?? [];
}

export async function fetchJrn036CommissionDetail(
  commissionId: string,
): Promise<Jrn036CommissionDetail> {
  return request<Jrn036CommissionDetail>(
    `/dsh/control-panel/finance/commissions/${encodeURIComponent(commissionId)}`,
  );
}

export async function fetchJrn036SettlementEvidence(
  settlementId: string,
): Promise<readonly Jrn036SettlementEvidence[]> {
  const response = await request<{ readonly evidence: Jrn036SettlementEvidence[] }>(
    `/dsh/control-panel/finance/settlements/${encodeURIComponent(settlementId)}/evidence`,
  );
  return response.evidence ?? [];
}

export async function upsertJrn036CommissionPolicy(
  input: Jrn036CommissionPolicyInput,
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
): Promise<Jrn036Commission> {
  const response = await request<{ readonly commission: Jrn036Commission }>(
    `/dsh/control-panel/finance/commissions/${encodeURIComponent(commissionId)}/${action}`,
    {
      method: "POST",
      body,
    },
  );
  return response.commission;
}

export const adjustJrn036Commission = (
  commissionId: string,
  deltaMinorUnits: number,
  reason: string,
) => commissionAction(commissionId, "adjust", { deltaMinorUnits, reason });

export const confirmJrn036Commission = (commissionId: string) =>
  commissionAction(commissionId, "confirm", {});

export const settleJrn036Commission = (commissionId: string) =>
  commissionAction(commissionId, "settle", {});

export const rejectJrn036Commission = (commissionId: string, reason: string) =>
  commissionAction(commissionId, "reject", { reason });

export const reverseJrn036Commission = (commissionId: string, reason: string) =>
  commissionAction(commissionId, "reverse", { reason });
