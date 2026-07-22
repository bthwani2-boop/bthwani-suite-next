import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";

export type PayoutActorType = "partner" | "captain" | "field";

export type PayoutDestination = {
  readonly id: string;
  readonly ownerActorId: string;
  readonly ownerActorType: PayoutActorType;
  readonly settlementPreference: "bank" | "mobile_money" | "manual" | string;
  readonly maskedAccountNumber: string;
  readonly maskedIban: string;
  readonly maskedMobileNumber: string;
  readonly beneficiaryName: string;
  readonly bankName: string;
  readonly bankBranch: string;
  readonly active: boolean;
  readonly updatedAt: string;
};

export type PayoutDestinationInput = {
  readonly beneficiaryName: string;
  readonly bankName: string;
  readonly bankBranch: string;
  readonly accountNumber: string;
  readonly iban: string;
  readonly payoutMobileNumber: string;
  readonly settlementPreference: "bank" | "mobile_money" | "manual";
  readonly bankAccountHolderMatchesOwner: boolean;
  readonly bankNotes: string;
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
  "dsh-jrn037-payouts",
);

function ownFinanceBase(actorType: PayoutActorType): string {
  return `/dsh/${actorType}/me/finance`;
}

function errorStatus(error: unknown): number | undefined {
  return (error as { readonly status?: number }).status;
}

export async function fetchOwnPayoutDestination(actorType: PayoutActorType): Promise<PayoutDestination | null> {
  try {
    const response = await request<{ readonly payoutDestination: PayoutDestination }>(
      `${ownFinanceBase(actorType)}/payout-destination`,
    );
    return response.payoutDestination;
  } catch (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
}

export async function saveOwnPayoutDestination(
  actorType: PayoutActorType,
  input: PayoutDestinationInput,
): Promise<PayoutDestination> {
  const response = await request<{ readonly payoutDestination: PayoutDestination }>(
    `${ownFinanceBase(actorType)}/payout-destination`,
    {
      method: "PUT",
      body: input,
      idempotencyKey: `destination:${actorType}:${input.settlementPreference}:${input.beneficiaryName.trim()}`,
    },
  );
  return response.payoutDestination;
}

export async function deactivateOwnPayoutDestination(actorType: PayoutActorType): Promise<void> {
  await request<void>(`${ownFinanceBase(actorType)}/payout-destination/deactivate`, {
    method: "POST",
    body: {},
    idempotencyKey: `destination-deactivate:${actorType}`,
  });
}

export async function fetchOwnPayoutRequests(actorType: PayoutActorType): Promise<readonly ActorPayoutRequest[]> {
  const response = await request<{ readonly payoutRequests: ActorPayoutRequest[] }>(
    `${ownFinanceBase(actorType)}/payout-requests`,
  );
  return response.payoutRequests ?? [];
}

export async function createOwnPayoutRequest(
  actorType: PayoutActorType,
  payoutDestinationId: string,
  amountMinorUnits: number,
  currency: string,
  idempotencyKey: string,
): Promise<ActorPayoutRequest> {
  const response = await request<{ readonly payoutRequest: ActorPayoutRequest }>(
    `${ownFinanceBase(actorType)}/payout-requests`,
    {
      method: "POST",
      body: { payoutDestinationId, amountMinorUnits, currency, idempotencyKey },
      idempotencyKey,
    },
  );
  return response.payoutRequest;
}
