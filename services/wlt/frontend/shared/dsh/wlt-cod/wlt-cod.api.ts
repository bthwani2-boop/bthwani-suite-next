import type { components } from "@bthwani/wlt-openapi";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { createDshHttpClient } from "../dsh-link/dsh-http-request";
import {
  requestDshReference,
  type DshReferenceApiResult,
} from "../dsh-link/dsh-reference-client";
import type { WltDshCodReference } from "../finance-boundary/wlt-dsh-boundary.types";

export type { WltDshCodReference };
export type { DshReferenceApiResult } from "../dsh-link/dsh-reference-client";

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

export function fetchDshCaptainOwnCodRecords(): Promise<
  DshReferenceApiResult<WltDshCodReference[]>
> {
  return requestDshReference<
    { readonly codRecords?: readonly WltDshCodReference[] },
    WltDshCodReference[]
  >(
    resolveDshApiBaseUrl(),
    "/dsh/captain/finance/cod-records",
    (response) => [...(response.codRecords ?? [])],
  );
}

function codClient() {
  return createDshHttpClient(resolveDshApiBaseUrl(), "wlt-dsh-cod");
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

  return codClient().request<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/collect`,
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
  const normalizedRecordId = recordId.trim();
  const proofReference = input.proofReference.trim();
  if (!normalizedRecordId || proofReference.length < 3) {
    throw new Error("Invalid request");
  }

  return codClient().request<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(normalizedRecordId)}/remit`,
    {
      method: "POST",
      body: {
        proofReference,
        note: input.note?.trim() ?? "",
      },
    },
  );
}
