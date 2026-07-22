import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { WltDshCodReference } from "@bthwani/wlt";
import type { WltReferenceApiResult } from "@bthwani/wlt/frontend/shared/dsh/wlt-dsh-http-request";

// WLT internal financial reads and writes are service-authenticated; DSH
// surfaces use the governed DSH proxy and never call WLT directly.
const { request: wltRequest } = createDshHttpClient(resolveDshApiBaseUrl(), "wlt-cod");

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

// Captain self-view: the DSH backend locks the captain id to the authenticated
// actor, so no captainId parameter exists here by design.
export async function fetchDshCaptainOwnCodRecords(): Promise<WltReferenceApiResult<WltDshCodReference[]>> {
  try {
    const body = await wltRequest<{ codRecords?: WltDshCodReference[] }>("/dsh/captain/finance/cod-records");
    return { ok: true, data: body.codRecords ?? [] };
  } catch (e) {
    const err = e as { kind?: string; status?: number; body?: string; message?: string };
    if (err.kind === "http") {
      return { ok: false, kind: "http", ...(err.status !== undefined ? { status: err.status } : {}), message: err.body || `HTTP ${err.status ?? "error"}` };
    }
    return { ok: false, kind: "network", message: err.message ?? "network error" };
  }
}

export async function collectDshCaptainCod(
  recordId: string,
  input: DshCaptainCodCollectionInput,
): Promise<WltCodCustodyMutationResult> {
  const proofReference = input.proofReference.trim();
  if (!recordId.trim() || !Number.isSafeInteger(input.actualAmountMinorUnits) || input.actualAmountMinorUnits <= 0 || proofReference.length < 3) {
    throw new Error("بيانات التحصيل أو الإثبات غير مكتملة.");
  }
  const correlationId = corrId("captain-cod-collect");
  return wltRequest<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(recordId)}/collect`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${recordId}:${proofReference}`,
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
    throw new Error("مرجع إثبات الإيداع مطلوب.");
  }
  const correlationId = corrId("captain-cod-remit");
  return wltRequest<WltCodCustodyMutationResult>(
    `/dsh/captain/finance/cod-records/${encodeURIComponent(recordId)}/remit`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${recordId}:${proofReference}`,
      body: {
        proofReference,
        note: input.note?.trim() ?? "",
      },
    },
  );
}
