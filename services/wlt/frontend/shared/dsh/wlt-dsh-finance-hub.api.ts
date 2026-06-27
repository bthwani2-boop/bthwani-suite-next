import { getWltApiBaseUrl } from "./wlt-dsh-api-base-url";
import type { WltDshFinanceRuntimeResult } from "./wlt-dsh-finance-hub.types";

export async function loadWltDshFinanceRuntimeReadModel(): Promise<WltDshFinanceRuntimeResult> {
  const baseUrl = getWltApiBaseUrl();
  if (!baseUrl) {
    return {
      state: "blocked",
      baseUrl: "",
      error: "wlt_runtime_base_url_missing",
    };
  }

  try {
    const [overviewResp, ledgerResp, refundsResp, closeStatusResp] = await Promise.all([
      fetch(`${baseUrl}/wlt/settlements`),
      fetch(`${baseUrl}/wlt/ledger?limit=250`),
      fetch(`${baseUrl}/wlt/refunds`),
      fetch(`${baseUrl}/wlt/control-panel/reconciliation-close-status`),
    ]);

    if (!overviewResp.ok) throw new Error(`overview_err: HTTP ${overviewResp.status}`);
    if (!ledgerResp.ok) throw new Error(`ledger_err: HTTP ${ledgerResp.status}`);
    if (!refundsResp.ok) throw new Error(`refunds_err: HTTP ${refundsResp.status}`);
    if (!closeStatusResp.ok) throw new Error(`close_status_err: HTTP ${closeStatusResp.status}`);

    const overview = await overviewResp.json();
    const ledgerData = await ledgerResp.json();
    const refundsData = await refundsResp.json();
    const closeStatus = await closeStatusResp.json();

    return {
      state: "runtime",
      data: {
        baseUrl,
        overview,
        ledgerEntries: ledgerData.entries ?? [],
        refunds: refundsData.refunds ?? [],
        closeStatus: closeStatus ?? { status: "open", businessDate: new Date().toISOString().split("T")[0] },
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      state: "blocked",
      baseUrl,
      error: error instanceof Error ? error.message : "wlt_runtime_unavailable",
    };
  }
}
