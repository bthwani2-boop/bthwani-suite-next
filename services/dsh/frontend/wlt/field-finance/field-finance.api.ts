import type { operations } from "@bthwani/dsh/openapi";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";

// Uses authenticated DSH proxy — never calls WLT directly from the field app.
// Identity is resolved server-side from the bearer token; no actor id in query.
const { request: fieldGet } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "dsh-field-finance",
);

type WalletResponse =
  operations["getDshFieldMeWallet"]["responses"][200]["content"]["application/json"];
type LedgerEntriesResponse =
  operations["getDshFieldMeLedgerEntries"]["responses"][200]["content"]["application/json"];
type CommissionsResponse =
  operations["getDshFieldMeCommissions"]["responses"][200]["content"]["application/json"];
type PayoutRequestsResponse =
  operations["getDshFieldMePayoutRequests"]["responses"][200]["content"]["application/json"];
type PayoutRequestCreatedResponse =
  operations["submitDshFieldMePayoutRequest"]["responses"][201]["content"]["application/json"];
type SubmitPayoutRequestBody = NonNullable<
  operations["submitDshFieldMePayoutRequest"]["requestBody"]
>["content"]["application/json"];

// Payload shapes derive from the composed DSH contract; WLT owns their truth.
export type FieldWallet = WalletResponse["wallet"];
export type FieldLedgerEntry = LedgerEntriesResponse["ledgerEntries"][number];
export type FieldCommission = CommissionsResponse["commissions"][number];
export type FieldPayoutRequest = PayoutRequestsResponse["payoutRequests"][number];

/** Stable reason code for the consuming surface; never a localized sentence. */
function codeFrom(error: unknown): string {
  const err = error as { code?: unknown; status?: unknown };
  if (typeof err.code === "string" && err.code.trim()) return err.code.trim();
  return typeof err.status === "number" ? `HTTP_${err.status}` : "INTERNAL_ERROR";
}

function messageFrom(error: unknown): string {
  const err = error as { status?: number; message?: string };
  return err.message ?? `HTTP ${err.status ?? "error"}`;
}

export async function fetchFieldMeWallet(): Promise<
  | { ok: true; wallet: FieldWallet }
  | { ok: false; message: string; code: string }
> {
  try {
    const data = await fieldGet<WalletResponse>("/dsh/field/me/finance/wallet");
    return { ok: true, wallet: data.wallet };
  } catch (error) {
    return { ok: false, message: messageFrom(error), code: codeFrom(error) };
  }
}

export async function fetchFieldMeLedgerEntries(): Promise<
  | { ok: true; ledgerEntries: FieldLedgerEntry[] }
  | { ok: false; message: string; code: string }
> {
  try {
    const data = await fieldGet<LedgerEntriesResponse>(
      "/dsh/field/me/finance/ledger-entries?limit=30",
    );
    return { ok: true, ledgerEntries: data.ledgerEntries ?? [] };
  } catch (error) {
    return { ok: false, message: messageFrom(error), code: codeFrom(error) };
  }
}

export async function fetchFieldMeCommissions(): Promise<
  | { ok: true; commissions: FieldCommission[] }
  | { ok: false; message: string; code: string }
> {
  try {
    const data = await fieldGet<CommissionsResponse>(
      "/dsh/field/me/finance/commissions",
    );
    return { ok: true, commissions: data.commissions ?? [] };
  } catch (error) {
    return { ok: false, message: messageFrom(error), code: codeFrom(error) };
  }
}

export async function fetchFieldMePayoutRequests(): Promise<
  | { ok: true; payoutRequests: FieldPayoutRequest[] }
  | { ok: false; message: string; code: string }
> {
  try {
    const data = await fieldGet<PayoutRequestsResponse>(
      "/dsh/field/me/finance/payout-requests",
    );
    return { ok: true, payoutRequests: data.payoutRequests ?? [] };
  } catch (error) {
    return { ok: false, message: messageFrom(error), code: codeFrom(error) };
  }
}

/**
 * Submits a SPECIFIED-amount payout through the governed actor payout route.
 * The live DSH handler requires `amountMode`; FULL_AVAILABLE is reserved for
 * full-balance cash-out flows that do not take a caller amount.
 */
export async function submitFieldMePayoutRequest(
  amountMinorUnits: number,
  currency: string,
  idempotencyKey: string,
): Promise<
  | { ok: true; payoutRequest: FieldPayoutRequest }
  | { ok: false; message: string; code: string }
> {
  try {
    const body: SubmitPayoutRequestBody = {
      amountMode: "SPECIFIED",
      amountMinorUnits,
      currency,
      idempotencyKey,
    };
    const data = await fieldGet<PayoutRequestCreatedResponse>(
      "/dsh/field/me/finance/payout-requests",
      {
        method: "POST",
        body,
        idempotencyKey,
      },
    );
    return { ok: true, payoutRequest: data.payoutRequest };
  } catch (error) {
    return { ok: false, message: messageFrom(error), code: codeFrom(error) };
  }
}
