import type { components, paths } from "@bthwani/wlt-openapi";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../dsh-link/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "cod-reconciliation");

export type CodReconciliationCase = components["schemas"]["CodReconciliationCase"];

type ResolveCodReconciliationRequest =
  paths["/wlt/cod-reconciliation-cases/{caseId}/resolve"]["post"]["requestBody"]["content"]["application/json"];

export type CodResolutionAction = ResolveCodReconciliationRequest["resolutionAction"];

export async function loadCodReconciliationCases(
  status?: CodReconciliationCase["status"],
): Promise<readonly CodReconciliationCase[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const body = await request<{
    readonly codReconciliationCases?: readonly CodReconciliationCase[];
  }>(`/dsh/control-panel/finance/cod-reconciliation-cases${query}`);
  return body.codReconciliationCases ?? [];
}

export async function assignCodReconciliationCase(
  caseId: string,
  investigationNote: string,
): Promise<CodReconciliationCase> {
  const correlationId = corrId("cod-reconciliation-assign");
  const body = await request<{
    readonly codReconciliationCase: CodReconciliationCase;
  }>(
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

export async function resolveCodReconciliationCase(
  caseId: string,
  resolutionAction: CodResolutionAction,
  resolutionNote: string,
): Promise<CodReconciliationCase> {
  const correlationId = corrId("cod-reconciliation-resolve");
  const body = await request<{
    readonly codReconciliationCase: CodReconciliationCase;
  }>(
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
