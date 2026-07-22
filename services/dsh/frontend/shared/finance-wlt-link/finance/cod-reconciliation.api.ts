import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "finance-hub");

export type CodReconciliationStatus = "open" | "investigating" | "resolved";

export type CodResolutionAction =
  | "confirmed_variance"
  | "cash_adjustment"
  | "collector_recovery"
  | "write_off";

export type CodReconciliationCase = {
  readonly id: string;
  readonly codRecordId: string;
  readonly custodyEvidenceId: string;
  readonly expectedAmountMinorUnits: number;
  readonly actualAmountMinorUnits: number;
  readonly differenceMinorUnits: number;
  readonly currency: string;
  readonly triggerReason: string;
  readonly status: CodReconciliationStatus;
  readonly assignedToOperatorId?: string | null;
  readonly assignedAt?: string | null;
  readonly investigationNote: string;
  readonly resolvedByOperatorId?: string | null;
  readonly resolutionAction?: CodResolutionAction | null;
  readonly resolutionNote: string;
  readonly resolvedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type ListCasesResponse = {
  readonly codReconciliationCases?: readonly CodReconciliationCase[];
};

type CaseEnvelopeResponse = {
  readonly codReconciliationCase?: CodReconciliationCase;
};

export async function loadCodReconciliationCases(status?: CodReconciliationStatus): Promise<readonly CodReconciliationCase[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await request<ListCasesResponse>(`/dsh/control-panel/finance/cod-reconciliation-cases${query}`, {
    method: "GET",
  });
  return res.codReconciliationCases ?? [];
}

export async function assignCodReconciliationCase(
  caseId: string,
  investigationNote: string = ""
): Promise<CodReconciliationCase> {
  const res = await request<CaseEnvelopeResponse>(
    `/dsh/control-panel/finance/cod-reconciliation-cases/${encodeURIComponent(caseId)}/assign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorId: "current-operator", investigationNote }),
    }
  );
  if (!res.codReconciliationCase) {
    throw new Error("لم يتم إرجاع حالة قضية المصالحة بعد الإسناد.");
  }
  return res.codReconciliationCase;
}

export async function resolveCodReconciliationCase(
  caseId: string,
  resolutionAction: CodResolutionAction,
  resolutionNote: string
): Promise<CodReconciliationCase> {
  const res = await request<CaseEnvelopeResponse>(
    `/dsh/control-panel/finance/cod-reconciliation-cases/${encodeURIComponent(caseId)}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionAction, resolutionNote }),
    }
  );
  if (!res.codReconciliationCase) {
    throw new Error("لم يتم إرجاع حالة قضية المصالحة بعد قرار المصالحة.");
  }
  return res.codReconciliationCase;
}
