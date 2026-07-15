import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";

// Uses authenticated DSH proxy — never calls WLT directly from the field app.
// Identity is resolved server-side from the bearer token; no actor id in query.
const { request: fieldGet } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-field-finance",
);

export type FieldWallet = {
  readonly actorId: string;
  readonly actorType: string;
  readonly status: string;
  readonly currency: string;
  readonly availableBalanceMinorUnits: number;
  readonly pendingBalanceMinorUnits: number;
  readonly heldBalanceMinorUnits: number;
  readonly earnedTotalMinorUnits: number;
  readonly settledTotalMinorUnits: number;
  readonly paidTotalMinorUnits: number;
  readonly lastLedgerEntryAt: string | null;
  readonly updatedAt: string | null;
};

export type FieldCommission = {
  readonly id: string;
  readonly beneficiaryActorId: string;
  readonly beneficiaryActorType: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly visitId: string | null;
  readonly storeId: string | null;
  readonly partnerId: string | null;
  readonly commissionPolicyId: string | null;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: string;
  readonly idempotencyKey: string | null;
};

export type FieldPayoutRequest = {
  readonly id: string;
  readonly beneficiaryActorId: string;
  readonly beneficiaryActorType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: string;
  readonly requestedAt: string;
  readonly completedAt: string | null;
  readonly failureReason: string | null;
};

export async function fetchFieldMeWallet(): Promise<
  | { ok: true; wallet: FieldWallet }
  | { ok: false; message: string }
> {
  try {
    const data = await fieldGet<{ wallet: FieldWallet }>("/dsh/field/me/finance/wallet");
    return { ok: true, wallet: data.wallet };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function fetchFieldMeCommissions(): Promise<
  | { ok: true; commissions: FieldCommission[] }
  | { ok: false; message: string }
> {
  try {
    const data = await fieldGet<{ commissions: FieldCommission[] }>("/dsh/field/me/finance/commissions");
    return { ok: true, commissions: data.commissions };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function fetchFieldMePayoutRequests(): Promise<
  | { ok: true; payoutRequests: FieldPayoutRequest[] }
  | { ok: false; message: string }
> {
  try {
    const data = await fieldGet<{ payoutRequests: FieldPayoutRequest[] }>("/dsh/field/me/finance/payout-requests");
    return { ok: true, payoutRequests: data.payoutRequests };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function submitFieldMePayoutRequest(
  amountMinorUnits: number,
  currency: string,
  idempotencyKey: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await fieldGet<{ status: string }>("/dsh/field/me/finance/payout-requests", {
      method: "POST",
      body: { amountMinorUnits, currency, idempotencyKey },
      idempotencyKey,
    });
    return { ok: true };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}
