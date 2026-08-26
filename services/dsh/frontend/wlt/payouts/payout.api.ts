import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";

export type PayoutActorType = "partner" | "captain" | "field";
export type PayoutAmountMode = "FULL_AVAILABLE" | "SPECIFIED";

export type PayoutDestinationVerificationStatus =
  | "unverified"
  | "verified"
  | "requires_reverification"
  | "rejected"
  | string;

export type PayoutDestination = {
  readonly id: string;
  readonly ownerActorId: string;
  readonly ownerActorType: PayoutActorType;
  readonly beneficiaryName: string;
  readonly officialWalletProviderKey: string;
  readonly destinationMethod: string;
  readonly maskedDestinationReference: string;
  readonly destinationVerificationStatus: string;
  readonly destinationVersion: number;
  readonly active: boolean;
  readonly updatedAt: string;
};

export type ActorPayoutRequest = {
  readonly id: string;
  readonly beneficiaryActorId: string;
  readonly beneficiaryActorType: PayoutActorType;
  readonly payoutDestinationId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: string;
  readonly reconciliationStatus: string;
  readonly requestedAt: string;
  readonly completedAt: string | null;
  readonly failureReason: string;
  readonly providerReference: string;
  readonly providerStatus: string;
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-payouts",
);

const payoutDestinationPathByActor: Record<PayoutActorType, string> = {
  partner: "/dsh/partner/me/finance/payout-destination",
  captain: "/dsh/captain/me/finance/payout-destination",
  field: "/dsh/field/me/finance/payout-destination",
};

const payoutRequestsPathByActor: Record<PayoutActorType, string> = {
  partner: "/dsh/partner/me/finance/payout-requests",
  captain: "/dsh/captain/me/finance/payout-requests",
  field: "/dsh/field/me/finance/payout-requests",
};

function errorStatus(error: unknown): number | undefined {
  return (error as { readonly status?: number }).status;
}

export function isVerifiedPayoutDestination(
  destination: PayoutDestination | null | undefined,
): destination is PayoutDestination {
  return Boolean(
    destination?.active &&
      destination.destinationMethod === "official_wallet" &&
      destination.destinationVerificationStatus === "verified",
  );
}

export async function fetchOwnPayoutDestination(actorType: PayoutActorType): Promise<PayoutDestination | null> {
  try {
    const response = await request<{ readonly payoutDestination: PayoutDestination }>(
      payoutDestinationPathByActor[actorType],
    );
    return response.payoutDestination;
  } catch (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
}

export async function fetchOwnPayoutRequests(actorType: PayoutActorType): Promise<readonly ActorPayoutRequest[]> {
  const response = await request<{ readonly payoutRequests: ActorPayoutRequest[] }>(
    payoutRequestsPathByActor[actorType],
  );
  return response.payoutRequests ?? [];
}

export async function createOwnPayoutRequest(
  actorType: PayoutActorType,
  amountMode: PayoutAmountMode,
  amountMinorUnits: number | undefined,
  currency: string,
  idempotencyKey: string,
): Promise<ActorPayoutRequest> {
  if (amountMode === "FULL_AVAILABLE" && amountMinorUnits !== undefined) {
    throw new Error("FULL_AVAILABLE payout requests must not send an amount.");
  }
  if (amountMode === "SPECIFIED" && (!Number.isSafeInteger(amountMinorUnits) || (amountMinorUnits ?? 0) <= 0)) {
    throw new Error("SPECIFIED payout requests require a positive minor-unit amount.");
  }
  const body = amountMode === "SPECIFIED"
    ? { amountMode, amountMinorUnits, currency, idempotencyKey }
    : { amountMode, currency, idempotencyKey };
  const response = await request<{ readonly payoutRequest: ActorPayoutRequest }>(
    payoutRequestsPathByActor[actorType],
    {
      method: "POST",
      body,
      idempotencyKey,
    },
  );
  return response.payoutRequest;
}
