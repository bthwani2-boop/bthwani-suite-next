import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { WltDshFinanceRuntimeResult, WltFinancialSummaryRaw } from "@bthwani/wlt";

const { request: financeRequest } = createDshHttpClient(resolveDshApiBaseUrl(), "finance-hub");

type RuntimeData = Extract<WltDshFinanceRuntimeResult, { readonly state: "runtime" }>["data"];
export type FinancePayoutRequest = RuntimeData["payoutRequests"][number];
type FinanceLedgerEntry = RuntimeData["ledgerEntries"][number];
type FinanceRefund = RuntimeData["refunds"][number];
type FinanceOverview = RuntimeData["overview"];

type LoadResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly message: string };
export type FinanceActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

type ErrorShape = {
  readonly kind?: string;
  readonly status?: number;
  readonly code?: string;
  readonly message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayField<T>(body: unknown, key: string): readonly T[] {
  if (!isRecord(body)) return [];
  const value = body[key];
  return Array.isArray(value) ? (value as readonly T[]) : [];
}

function objectField<T>(body: unknown, key: string): T | null {
  if (!isRecord(body)) return null;
  const value = body[key];
  return isRecord(value) ? (value as T) : null;
}

function classifyFinanceRuntimeError(err: ErrorShape): string {
  if (err.kind === "network") return "RUNTIME_PORT_MISMATCH";
  if (err.status === 401) return "AUTH_MISSING";
  if (err.status === 403) return err.code ?? "FINANCE_PERMISSION_DENIED";
  if (err.code === "WLT_NOT_CONFIGURED") return "WLT_NOT_CONFIGURED";
  if (err.code === "WLT_UNAVAILABLE") return "WLT_UNAVAILABLE";
  if (err.code === "NOT_FOUND" && err.message === "Route not found") return "ROUTE_NOT_FOUND";
  if (err.code) return err.code;
  return `HTTP_${err.status ?? "ERROR"}`;
}

async function tryGet<T>(path: string, extract: (body: unknown) => T): Promise<LoadResult<T>> {
  try {
    const body = await financeRequest<unknown>(path);
    return { ok: true, data: extract(body) };
  } catch (error) {
    const err = error as ErrorShape;
    return { ok: false, message: classifyFinanceRuntimeError(err) };
  }
}

export async function loadDshFinanceRuntimeReadModel(): Promise<WltDshFinanceRuntimeResult> {
  const baseUrl = resolveDshApiBaseUrl();
  if (!baseUrl) {
    return { state: "blocked", runtimeApiUrl: "", error: "dsh_runtime_base_url_missing" };
  }

  const [overview, ledger, refunds, payoutRequests, financialSummary] = await Promise.all([
    tryGet<FinanceOverview>("/dsh/control-panel/finance/settlements", (body) => (isRecord(body) ? (body as FinanceOverview) : null)),
    tryGet<readonly FinanceLedgerEntry[]>("/dsh/control-panel/finance/ledger/entries?limit=250", (body) => arrayField<FinanceLedgerEntry>(body, "ledgerEntries")),
    tryGet<readonly FinanceRefund[]>("/dsh/control-panel/finance/refunds", (body) => arrayField<FinanceRefund>(body, "refunds")),
    tryGet<readonly FinancePayoutRequest[]>("/dsh/control-panel/finance/payout-requests", (body) => arrayField<FinancePayoutRequest>(body, "payoutRequests")),
    tryGet<WltFinancialSummaryRaw | null>("/dsh/control-panel/finance/financial-summary", (body) => objectField<WltFinancialSummaryRaw>(body, "financialSummary")),
  ]);

  const failures: { readonly key: string; readonly message: string }[] = [];
  if (!overview.ok) failures.push({ key: "overview_err", message: overview.message });
  if (!ledger.ok) failures.push({ key: "ledger_err", message: ledger.message });
  if (!refunds.ok) failures.push({ key: "refunds_err", message: refunds.message });
  if (!payoutRequests.ok) failures.push({ key: "payoutRequests_err", message: payoutRequests.message });
  if (!financialSummary.ok) failures.push({ key: "financialSummary_err", message: financialSummary.message });

  if (!overview.ok || !ledger.ok || !refunds.ok || !payoutRequests.ok || !financialSummary.ok) {
    return {
      state: "blocked",
      runtimeApiUrl: baseUrl,
      error: `${failures.map((failure) => failure.key).join(", ")}: ${failures[0]?.message ?? "wlt_runtime_unavailable"}`,
    };
  }

  return {
    state: "runtime",
    data: {
      runtimeApiUrl: baseUrl,
      overview: overview.data,
      ledgerEntries: ledger.data,
      refunds: refunds.data,
      payoutRequests: payoutRequests.data,
      financialSummary: financialSummary.data,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export type PayoutTransition = "approve" | "reject" | "process" | "complete" | "fail";

export async function transitionPayoutRequest(payoutId: string, transition: PayoutTransition): Promise<FinanceActionResult> {
  try {
    await financeRequest<unknown>(
      `/dsh/control-panel/finance/payout-requests/${encodeURIComponent(payoutId)}/${transition}`,
      { method: "POST" },
    );
    return { ok: true };
  } catch (error) {
    const err = error as ErrorShape;
    return {
      ok: false,
      code: classifyFinanceRuntimeError(err),
      message: err.message ?? "تعذر تنفيذ انتقال طلب الصرف.",
    };
  }
}

export function approvePayoutRequest(payoutId: string): Promise<FinanceActionResult> {
  return transitionPayoutRequest(payoutId, "approve");
}

export function rejectPayoutRequest(payoutId: string): Promise<FinanceActionResult> {
  return transitionPayoutRequest(payoutId, "reject");
}

export function processPayoutRequest(payoutId: string): Promise<FinanceActionResult> {
  return transitionPayoutRequest(payoutId, "process");
}

export function completePayoutRequest(payoutId: string): Promise<FinanceActionResult> {
  return transitionPayoutRequest(payoutId, "complete");
}

export function failPayoutRequest(payoutId: string): Promise<FinanceActionResult> {
  return transitionPayoutRequest(payoutId, "fail");
}

export type ReconciliationCase = {
  readonly id: string;
  readonly paymentSessionId: string;
  readonly operation: string;
  readonly triggerReason: string;
  readonly status: string;
  readonly assignedToOperatorId: string;
  readonly resolvedByOperatorId: string;
  readonly resolutionAction: string;
  readonly resolutionNote: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export async function loadOpenReconciliationCases(): Promise<LoadResult<readonly ReconciliationCase[]>> {
  return tryGet("/dsh/control-panel/finance/reconciliation-cases?status=open", (body) => arrayField<ReconciliationCase>(body, "reconciliationCases"));
}

export async function assignReconciliationCase(caseId: string): Promise<FinanceActionResult> {
  try {
    await financeRequest<unknown>(`/dsh/control-panel/finance/reconciliation-cases/${encodeURIComponent(caseId)}/assign`, { method: "POST" });
    return { ok: true };
  } catch (error) {
    const err = error as ErrorShape;
    return { ok: false, code: classifyFinanceRuntimeError(err), message: err.message ?? "تعذر إسناد حالة المطابقة." };
  }
}

export async function resolveReconciliationCase(
  caseId: string,
  resolutionAction: "confirmed_success" | "confirmed_failed" | "manual_adjustment" | "ignored",
  resolutionNote: string,
): Promise<FinanceActionResult> {
  try {
    await financeRequest<unknown>(`/dsh/control-panel/finance/reconciliation-cases/${encodeURIComponent(caseId)}/resolve`, {
      method: "POST",
      body: { resolutionAction, resolutionNote },
    });
    return { ok: true };
  } catch (error) {
    const err = error as ErrorShape;
    return { ok: false, code: classifyFinanceRuntimeError(err), message: err.message ?? "تعذر حسم حالة المطابقة." };
  }
}
