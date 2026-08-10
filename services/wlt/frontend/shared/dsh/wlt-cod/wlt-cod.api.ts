import type { components } from "@bthwani/wlt-openapi";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../dsh-link/dsh-http-request";

import type { WltDshCodReference } from "../finance-boundary/wlt-dsh-boundary.types";
export type { WltDshCodReference };

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

export type DshCaptainCodCollectionInput = Pick<
  components["schemas"]["CollectCodInput"],
  "actualAmountMinorUnits" | "proofReference" | "note"
>;

export type DshCaptainCodRemittanceInput = Pick<
  components["schemas"]["RemitCodInput"],
  "proofReference" | "note"
>;

export type WltCodCustodyEvidence = components["schemas"]["CodCustodyEvidence"];
export type WltCodReconciliationCase = components["schemas"]["CodReconciliationCase"];
export type WltCodCustodyMutationResult = Omit<
  components["schemas"]["CodCustodyMutationResult"],
  "codRecord"
> & {
  readonly codRecord: WltDshCodReference;
};

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "captain-cod",
);

function classifyDshReferenceError(error: unknown): Exclude<DshReferenceApiResult<never>, { readonly ok: true }> {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const value = error as { kind?: unknown; status?: unknown; message?: unknown };
    return {
      ok: false,
      kind: value.kind === "network" ? "network" : "http",
      ...(typeof value.status === "number" ? { status: value.status } : {}),
      message: typeof value.message === "string" ? value.message : "DSH request failed",
    };
  }
  return {
    ok: false,
    kind: "network",
    message: error instanceof Error ? error.message : "DSH request failed",
  };
}

export async function fetchDshCaptainOwnCodRecords(): Promise<DshReferenceApiResult<WltDshCodReference[]>> {
  try {
    const response = await request<{ codRecords?: WltDshCodReference[] }>(
      "/dsh/captain/finance/cod-records",
    );
    return { ok: true, data: response.codRecords ?? [] };
  } catch (error) {
    return classifyDshReferenceError(error);
  }
}

export async function collectDshCaptainCod(
  recordId: string,
  input: DshCaptainCodCollectionInput,
): Promise<WltCodCustodyMutationResult> {
  const normalizedRecordId = recordId.trim();
  const proofReference = input.proofReference.trim();
  if (!normalizedRecordId || !Number.isSafeInteger(input.actualAmountMinorUnits) || input.actualAmountMinorUnits <= 0 || proofReference.length < 3) {
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
