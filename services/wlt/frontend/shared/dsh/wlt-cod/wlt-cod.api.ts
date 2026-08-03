import { dshFetchJson, dshPostJson } from "../dsh-link/dsh-http-request";
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

export async function fetchDshCaptainOwnCodRecords(): Promise<DshReferenceApiResult<WltDshCodReference[]>> {
  const result = await dshFetchJson<{ codRecords?: WltDshCodReference[] }>(
    `${resolveDshApiBaseUrl()}/dsh/captain/finance/cod-records`,
    (body) => body as { codRecords?: WltDshCodReference[] },
  );
  if (!result.ok) {
    return {
      ok: false,
      kind: result.kind,
      ...(result.status !== undefined ? { status: result.status } : {}),
      message: result.message,
    };
  }
  return { ok: true, data: result.data.codRecords ?? [] };
}

export async function collectDshCaptainCod(
  recordId: string,
  input: DshCaptainCodCollectionInput,
): Promise<WltCodCustodyMutationResult> {
  const proofReference = input.proofReference.trim();
  if (!recordId.trim() || !Number.isSafeInteger(input.actualAmountMinorUnits) || input.actualAmountMinorUnits <= 0 || proofReference.length < 3) {
    throw new Error("Invalid request");
  }

  const result = await dshPostJson<WltCodCustodyMutationResult>(
    `${resolveDshApiBaseUrl()}/dsh/captain/finance/cod-records/${encodeURIComponent(recordId)}/collect`,
    {
      actualAmountMinorUnits: input.actualAmountMinorUnits,
      proofReference,
      note: input.note?.trim() ?? "",
    },
    (body: unknown) => body as WltCodCustodyMutationResult,
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function remitDshCaptainCod(
  recordId: string,
  input: DshCaptainCodRemittanceInput,
): Promise<WltCodCustodyMutationResult> {
  const proofReference = input.proofReference.trim();
  if (!recordId.trim() || proofReference.length < 3) {
    throw new Error("Invalid request");
  }

  const result = await dshPostJson<WltCodCustodyMutationResult>(
    `${resolveDshApiBaseUrl()}/dsh/captain/finance/cod-records/${encodeURIComponent(recordId)}/remit`,
    {
      proofReference,
      note: input.note?.trim() ?? "",
    },
    (body: unknown) => body as WltCodCustodyMutationResult,
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
