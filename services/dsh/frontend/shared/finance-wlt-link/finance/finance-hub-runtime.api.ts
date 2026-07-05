import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { WltDshFinanceRuntimeResult } from "@bthwani/wlt";

// WLT internal financial reads are service-authenticated, so the control-panel
// finance hub reads them through the governed DSH finance proxy — never
// directly from the browser. WLT stays the only owner of financial truth;
// this loader only assembles the read model DSH surfaces render.
const { request: financeGet } = createDshHttpClient(resolveDshApiBaseUrl(), "finance-hub");

type LoadResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function tryGet<T>(path: string, extract: (body: any) => T): Promise<LoadResult<T>> {
  try {
    const body = await financeGet<any>(path);
    return { ok: true, data: extract(body) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function loadDshFinanceRuntimeReadModel(): Promise<WltDshFinanceRuntimeResult> {
  const baseUrl = resolveDshApiBaseUrl();
  if (!baseUrl) {
    return {
      state: "blocked",
      baseUrl: "",
      error: "dsh_runtime_base_url_missing",
    };
  }

  const [overview, ledger, refunds] = await Promise.all([
    tryGet("/dsh/control-panel/finance/settlements", (body: any) => body),
    tryGet("/dsh/control-panel/finance/ledger/entries?limit=250", (body: any) => (body.entries ?? []) as readonly any[]),
    tryGet("/dsh/control-panel/finance/refunds", (body: any) => (body.refunds ?? []) as readonly any[]),
  ]);

  const failures: { key: string; message: string }[] = [];
  if (!overview.ok) failures.push({ key: "overview_err", message: overview.message });
  if (!ledger.ok) failures.push({ key: "ledger_err", message: ledger.message });
  if (!refunds.ok) failures.push({ key: "refunds_err", message: refunds.message });

  if (!overview.ok || !ledger.ok || !refunds.ok) {
    return {
      state: "blocked",
      baseUrl,
      error: `${failures.map((f) => f.key).join(", ")}: ${failures[0]?.message ?? "wlt_runtime_unavailable"}`,
    };
  }

  return {
    state: "runtime",
    data: {
      baseUrl,
      overview: overview.data,
      ledgerEntries: ledger.data,
      refunds: refunds.data,
      fetchedAt: new Date().toISOString(),
    },
  };
}
