import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { WltDshFinanceRuntimeResult } from "@bthwani/wlt";

// WLT internal financial reads are service-authenticated, so the control-panel
// finance hub reads them through the governed DSH finance proxy — never
// directly from the browser. WLT stays the only owner of financial truth;
// this loader only assembles the read model DSH surfaces render.
const { request: financeGet } = createDshHttpClient(resolveDshApiBaseUrl(), "finance-hub");

type LoadResult<T> = { ok: true; data: T } | { ok: false; message: string };

// Maps the raw transport/backend error into the one of the five diagnostic
// codes control-panel finance surfaces to operators, so "WLT runtime غير
// متاح" is never shown for causes it doesn't actually describe.
function classifyFinanceRuntimeError(err: {
  readonly kind?: string;
  readonly status?: number;
  readonly code?: string;
  readonly message?: string;
}): string {
  if (err.kind === "network") return "RUNTIME_PORT_MISMATCH";
  if (err.status === 401) return "AUTH_MISSING";
  if (err.code === "WLT_NOT_CONFIGURED") return "WLT_NOT_CONFIGURED";
  if (err.code === "WLT_UNAVAILABLE") return "WLT_UNAVAILABLE";
  if (err.code === "NOT_FOUND" && err.message === "Route not found") return "ROUTE_NOT_FOUND";
  if (err.code) return err.code;
  return `HTTP_${err.status ?? "ERROR"}`;
}

async function tryGet<T>(path: string, extract: (body: any) => T): Promise<LoadResult<T>> {
  try {
    const body = await financeGet<any>(path);
    return { ok: true, data: extract(body) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; code?: string; message?: string };
    return { ok: false, message: classifyFinanceRuntimeError(err) };
  }
}

export async function loadDshFinanceRuntimeReadModel(): Promise<WltDshFinanceRuntimeResult> {
  const baseUrl = resolveDshApiBaseUrl();
  if (!baseUrl) {
    return {
      state: "blocked",
      runtimeApiUrl: "",
      error: "dsh_runtime_base_url_missing",
    };
  }

  const [overview, ledger, refunds, payoutRequests] = await Promise.all([
    tryGet("/dsh/control-panel/finance/settlements", (body: any) => body),
    tryGet("/dsh/control-panel/finance/ledger/entries?limit=250", (body: any) => (body.entries ?? []) as readonly any[]),
    tryGet("/dsh/control-panel/finance/refunds", (body: any) => (body.refunds ?? []) as readonly any[]),
    tryGet("/dsh/control-panel/finance/payout-requests?status=pending", (body: any) => (body.payoutRequests ?? []) as readonly any[]),
  ]);

  const failures: { key: string; message: string }[] = [];
  if (!overview.ok) failures.push({ key: "overview_err", message: overview.message });
  if (!ledger.ok) failures.push({ key: "ledger_err", message: ledger.message });
  if (!refunds.ok) failures.push({ key: "refunds_err", message: refunds.message });
  if (!payoutRequests.ok) failures.push({ key: "payoutRequests_err", message: payoutRequests.message });

  if (!overview.ok || !ledger.ok || !refunds.ok || !payoutRequests.ok) {
    return {
      state: "blocked",
      runtimeApiUrl: baseUrl,
      error: `${failures.map((f) => f.key).join(", ")}: ${failures[0]?.message ?? "wlt_runtime_unavailable"}`,
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
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function approvePayoutRequest(payoutId: string): Promise<boolean> {
  try {
    const { request: financePost } = createDshHttpClient(resolveDshApiBaseUrl(), "finance-hub");
    await financePost(`/dsh/control-panel/finance/payout-requests/${encodeURIComponent(payoutId)}/approve`, { method: "POST" });
    return true;
  } catch (e) {
    console.error("Failed to approve payout request", e);
    return false;
  }
}

export async function rejectPayoutRequest(payoutId: string): Promise<boolean> {
  try {
    const { request: financePost } = createDshHttpClient(resolveDshApiBaseUrl(), "finance-hub");
    await financePost(`/dsh/control-panel/finance/payout-requests/${encodeURIComponent(payoutId)}/reject`, { method: "POST" });
    return true;
  } catch (e) {
    console.error("Failed to reject payout request", e);
    return false;
  }
}
