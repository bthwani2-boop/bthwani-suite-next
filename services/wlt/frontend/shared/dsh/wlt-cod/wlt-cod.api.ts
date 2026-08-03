import { createDshFlexibleHttpClient } from "../dsh-link/dsh-http-request";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import type { components } from "@bthwani/wlt-openapi";

import type { WltDshCodReference } from "../finance-boundary/wlt-dsh-boundary.types";
export type { WltDshCodReference };

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

/** DSH façade input. Actor identity is resolved server-side and is never caller-selected. */
export type DshCaptainCodCollectionInput = Pick<
  components["schemas"]["CollectCodInput"],
  "actualAmountMinorUnits" | "proofReference" | "note"
>;

/** DSH façade input. Actor identity is resolved server-side and is never caller-selected. */
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

const { request } = createDshFlexibleHttpClient(resolveDshApiBaseUrl());

function classifyDshReferenceError(error: unknown): Exclude<DshReferenceApiResult<never>, { readonly ok: true }> {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const value = error as { kind?: unknown; status?: unknown; message?: unknown };
    const kind = value.kind === "network" ? "network" : "http";
    return {
      ok: false,
      kind,
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
  const proofReference = input.proofReference.trim();
  if (!recordId.trim() || !Number.isSafeInteger(input.actualAmountMinorUnits) || input.actualAmountMinorUnits <= 0 || proofReference.length < 3) {
    throw new Error("Invalid request");
  }

  return request<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(recordId)}/collect`,
    {
      method: "POST",
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
  const proofReference = input.proofReference.trim();
  if (!recordId.trim() || proofReference.length < 3) {
    throw new Error("Invalid request");
  }

  return request<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(recordId)}/remit`,
    {
      method: "POST",
      body: {
        proofReference,
        note: input.note?.trim() ?? "",
      },
    },
  );
}
