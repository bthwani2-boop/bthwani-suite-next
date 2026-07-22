import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "cod-reconciliation");

export type CodReconciliationCase = {
  readonly id: string;
  readonly codRecordId: string;
  readonly custodyEvidenceId: string;
  readonly expectedAmountMinorUnits: number;
  readonly actualAmountMinorUnits: number;
  readonly differenceMinorUnits: number;
  readonly currency: string;
  readonly triggerReason: string;
  readonly status: "open" | "investigating" | "resolved";
  readonly assignedToOperatorId?: string | null;
  readonly assignedAt?: string | null;
  readonly investigationNote: string;
  readonly resolvedByOperatorId?: string | null;
  readonly resolutionAction?: string | null;
  readonly resolutionNote: string;
  readonly resolvedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export async function loadCodReconciliationCases(status?: CodReconciliationCase["status"]): Promise<readonly CodReconciliationCase[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const body = await request<{ readonly codReconciliationCases?: readonly CodReconciliationCase[] }>(
    `/dsh/control-panel/finance/cod-reconciliation-cases${query}`,
  );
  return body.codReconciliationCases ?? [];
}

export async function assignCodReconciliationCase(caseId: string, investigationNote: string): Promise<CodReconciliationCase> {
  const correlationId = corrId("cod-reconciliation-assign");
  const body = await request<{ readonly codReconciliationCase: CodReconciliationCase }>(
    `/dsh/control-panel/finance/cod-reconciliation-cases/${encodeURIComponent(caseId)}/assign`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${caseId}:assign`,
      body: { investigationNote: investigationNote.trim() },
    },
  );
  return body.codReconciliationCase;
}

export type CodResolutionAction = "confirmed_variance" | "cash_adjustment" | "collector_recovery" | "write_off";

export async function resolveCodReconciliationCase(
  caseId: string,
  resolutionAction: CodResolutionAction,
  resolutionNote: string,
): Promise<CodReconciliationCase> {
  const correlationId = corrId("cod-reconciliation-resolve");
  const body = await request<{ readonly codReconciliationCase: CodReconciliationCase }>(
    `/dsh/control-panel/finance/cod-reconciliation-cases/${encodeURIComponent(caseId)}/resolve`,
    {
      method: "POST",
      correlationId,
      idempotencyKey: `${correlationId}:${caseId}:${resolutionAction}`,
      body: { resolutionAction, resolutionNote: resolutionNote.trim() },
    },
  );
  return body.codReconciliationCase;
}
