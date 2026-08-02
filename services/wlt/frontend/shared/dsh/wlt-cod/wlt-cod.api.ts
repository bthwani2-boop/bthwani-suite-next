import { dshFetchJson, dshPostJson } from "../dsh-http/dsh-http-request";
import { resolveDshApiBaseUrl } from "../dsh-http/dsh-api-base-url";

import type { WltDshCodReference } from '../finance-boundary/wlt-dsh-boundary.types';
export type { WltDshCodReference };

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly kind: "http" | "network"; readonly status?: number; readonly message: string };

export type DshCaptainCodCollectionInput = {
  readonly actualAmountMinorUnits: number;
  readonly proofReference: string;
  readonly note?: string;
};

export type DshCaptainCodRemittanceInput = {
  readonly proofReference: string;
  readonly note?: string;
};

export type WltCodCustodyEvidence = {
  readonly id: string;
  readonly codRecordId: string;
  readonly eventType: "collection" | "remittance";
  readonly expectedAmountMinorUnits: number;
  readonly actualAmountMinorUnits: number;
  readonly differenceMinorUnits: number;
  readonly currency: string;
  readonly proofReference: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly note: string;
  readonly ledgerTransactionId: string;
  readonly createdAt: string;
};

export type WltCodReconciliationCase = {
  readonly id: string;
  readonly codRecordId: string;
  readonly expectedAmountMinorUnits: number;
  readonly actualAmountMinorUnits: number;
  readonly differenceMinorUnits: number;
  readonly currency: string;
  readonly status: "open" | "investigating" | "resolved";
};

export type WltCodCustodyMutationResult = {
  readonly codRecord: WltDshCodReference;
  readonly custodyEvidence: WltCodCustodyEvidence;
  readonly reconciliationCase?: WltCodReconciliationCase;
  readonly replayed: boolean;
};

export async function fetchDshCaptainOwnCodRecords(): Promise<DshReferenceApiResult<WltDshCodReference[]>> {
  const result = await dshFetchJson<{ codRecords?: WltDshCodReference[] }>(
    `${resolveDshApiBaseUrl()}/dsh/captain/finance/cod-records`,
    (body) => body as { codRecords?: WltDshCodReference[] }
  );
  if (!result.ok) {
    return { ok: false, kind: result.kind, ...(result.status !== undefined ? { status: result.status } : {}), message: result.message };
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
    (body: unknown) => body as WltCodCustodyMutationResult
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
    (body: unknown) => body as WltCodCustodyMutationResult
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
