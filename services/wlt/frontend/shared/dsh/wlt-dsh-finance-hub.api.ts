import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import { wltFetchJson } from "./wlt-dsh-http-request";
import type { WltDshFinanceRuntimeResult, WltCloseStatus } from "./wlt-dsh-finance-hub.types";

export async function loadWltDshFinanceRuntimeReadModel(): Promise<WltDshFinanceRuntimeResult> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return {
      state: "blocked",
      baseUrl: "",
      error: "wlt_runtime_base_url_missing",
    };
  }

  const [overview, ledger, refunds, closeStatus] = await Promise.all([
    wltFetchJson<any>(`${baseUrl}/wlt/settlements`, (body: any) => body),
    wltFetchJson<any[]>(`${baseUrl}/wlt/ledger?limit=250`, (body: any) => body.entries ?? []),
    wltFetchJson<any[]>(`${baseUrl}/wlt/refunds`, (body: any) => body.refunds ?? []),
    wltFetchJson<WltCloseStatus>(
      `${baseUrl}/wlt/control-panel/reconciliation-close-status`,
      (body: any) => body ?? { status: "open", businessDate: new Date().toISOString().split("T")[0] },
    ),
  ]);

  const failed = [
    !overview.ok && "overview_err",
    !ledger.ok && "ledger_err",
    !refunds.ok && "refunds_err",
    !closeStatus.ok && "close_status_err",
  ].filter((v): v is string => v !== false);

  if (!overview.ok || !ledger.ok || !refunds.ok || !closeStatus.ok) {
    const firstMessage = [overview, ledger, refunds, closeStatus].find((r) => !r.ok)?.message;
    return {
      state: "blocked",
      baseUrl,
      error: `${failed.join(", ")}: ${firstMessage ?? "wlt_runtime_unavailable"}`,
    };
  }

  return {
    state: "runtime",
    data: {
      baseUrl,
      overview: overview.data,
      ledgerEntries: ledger.data,
      refunds: refunds.data,
      closeStatus: closeStatus.data,
      fetchedAt: new Date().toISOString(),
    },
  };
}
