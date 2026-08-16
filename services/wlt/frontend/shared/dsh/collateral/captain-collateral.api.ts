import { corrId, createDshHttpClient } from "../dsh-link/dsh-http-request";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";

export type CaptainCollateralPolicy = {
  readonly operatorContextId: string;
  readonly policyId: string;
  readonly policyVersion: number;
  readonly enabled: boolean;
  readonly minimumCollateralMinorUnits: number;
  readonly currency: string;
  readonly changeReason: string;
  readonly updatedByActorId: string;
  readonly updatedAt: string;
};

export type CaptainCollateralPosition = {
  readonly id: string;
  readonly captainId: string;
  readonly currency: string;
  readonly policyId: string;
  readonly policyVersion: number;
  readonly protectedMinimumMinorUnits: number;
  readonly restrictedAmountMinorUnits: number;
  readonly sourcePaymentSessionId: string;
  readonly sourceLedgerTransactionId: string;
  readonly status: "active" | "released" | string;
  readonly releaseReason?: string | null;
  readonly createdAt: string;
  readonly releasedAt?: string | null;
};

export type CaptainCollateralReadback = {
  readonly policy: CaptainCollateralPolicy | null;
  readonly wallet: {
    readonly collateralReservedMinorUnits: number;
    readonly availableMinorUnits: number;
    readonly pendingMinorUnits: number;
    readonly heldMinorUnits: number;
    readonly codReservedMinorUnits: number;
    readonly outstandingDebtMinorUnits: number;
    readonly releasableExcessMinorUnits: number;
  };
  readonly positions: readonly CaptainCollateralPosition[];
  readonly releaseBlockedReason?: string;
};

type PositionEnvelope = { readonly position: CaptainCollateralPosition };

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "captain-collateral", 12000);

export async function fetchOwnCaptainCollateral(): Promise<CaptainCollateralReadback> {
  return request<CaptainCollateralReadback>("/dsh/captain/me/finance/collateral");
}

export async function allocateCaptainCollateral(input: {
  readonly paymentSessionId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}): Promise<CaptainCollateralPosition> {
  const response = await request<PositionEnvelope>("/dsh/captain/me/finance/collateral/allocate", {
    method: "POST",
    body: { paymentSessionId: input.paymentSessionId },
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
  });
  return response.position;
}

export async function releaseCaptainCollateral(input: {
  readonly positionId: string;
  readonly releaseReason: string;
  readonly idempotencyKey?: string;
  readonly correlationId?: string;
}): Promise<CaptainCollateralPosition> {
  const response = await request<PositionEnvelope>("/dsh/captain/me/finance/collateral/release", {
    method: "POST",
    body: { positionId: input.positionId, releaseReason: input.releaseReason },
    idempotencyKey: input.idempotencyKey ?? corrId("captain-collateral-release"),
    correlationId: input.correlationId ?? corrId("captain-collateral-release"),
  });
  return response.position;
}
