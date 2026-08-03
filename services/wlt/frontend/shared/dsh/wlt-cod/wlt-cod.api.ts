import type { components } from "../../../../clients/generated/wlt-api";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import {
  corrId,
  createDshHttpClient,
} from "../dsh-link/dsh-http-request";

import type { WltDshCodReference } from "../finance-boundary/wlt-dsh-boundary.types";
export type { WltDshCodReference };

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly kind: "http" | "network";
      readonly status?: number;
      readonly message: string;
    };

/** DSH facade input. Actor identity is resolved server-side. */
export type DshCaptainCodCollectionInput = Pick<
  components["schemas"]["CollectCodInput"],
  "actualAmountMinorUnits" | "proofReference" | "note"
>;

/** DSH facade input. Actor identity is resolved server-side. */
export type DshCaptainCodRemittanceInput = Pick<
  components["schemas"]["RemitCodInput"],
  "proofReference" | "note"
>;

export type WltCodCustodyEvidence =
  components["schemas"]["CodCustodyEvidence"];
export type WltCodReconciliationCase =
  components["schemas"]["CodReconciliationCase"];
export type WltCodCustodyMutationResult =
  components["schemas"]["CodCustodyMutationResult"];

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "captain-cod",
);

function referenceError(error: unknown): DshReferenceApiResult<never> {
  const value = error as {
    readonly kind?: string;
    readonly status?: number;
    readonly message?: string;
  };
  if (value.kind === "network") {
    return {
      ok: false,
      kind: "network",
      message: value.message ?? "network error",
    };
  }
  return {
    ok: false,
    kind: "http",
    ...(value.status !== undefined ? { status: value.status } : {}),
    message: value.message ?? "request failed",
  };
}

export async function fetchDshCaptainOwnCodRecords(): Promise<
  DshReferenceApiResult<WltDshCodReference[]>
> {
  try {
    const body = await request<{ codRecords?: WltDshCodReference[] }>(
      "/dsh/captain/finance/cod-records",
    );
    return { ok: true, data: body.codRecords ?? [] };
  } catch (error) {
    return referenceError(error);
  }
}

export async function collectDshCaptainCod(
  recordId: string,
  input: DshCaptainCodCollectionInput,
): Promise<WltCodCustodyMutationResult> {
  const normalizedRecordId = recordId.trim();
  const proofReference = input.proofReference.trim();
  if (
    !normalizedRecordId ||
    !Number.isSafeInteger(input.actualAmountMinorUnits) ||
    input.actualAmountMinorUnits <= 0 ||
    proofReference.length < 3
  ) {
    throw new Error("Invalid request");
  }

  const correlationId = corrId("captain-cod-collect");
  return request<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/collect`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${normalizedRecordId}:collect`,
      body: {
        actualAmountMinorUnits: input.actualAmountMinorUnits,
        proofReference,
        note: input.note?.trim() ?? "",
      },
    },
  );
}

export async function remitDshCaptainCod(
  recordId: string,
  input: DshCaptainCodRemittanceInput,
): Promise<WltCodCustodyMutationResult> {
  const normalizedRecordId = recordId.trim();
  const proofReference = input.proofReference.trim();
  if (!normalizedRecordId || proofReference.length < 3) {
    throw new Error("Invalid request");
  }

  const correlationId = corrId("captain-cod-remit");
  return request<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${normalizedRecordId}:remit`,
      body: {
        proofReference,
        note: input.note?.trim() ?? "",
      },
    },
  );
}
