import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { DshWltSettlementView, DshWltSettlementSummaryView } from "./wlt-settlement.types";

// WLT internal financial reads are service-authenticated; DSH surfaces read
// them through the governed DSH finance proxy, never from the browser.
const { request: wltGet } = createDshHttpClient(resolveDshApiBaseUrl(), "wlt-settlement");

type WltSettlementRaw = {
  readonly id: string;
  readonly partnerId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly grossAmount: number;
  readonly platformFee: number;
  readonly netAmount: number;
  readonly currency: string;
  readonly orderCount: number;
  readonly status: string;
  readonly settledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type WltSettlementSummaryRaw = {
  readonly partnerId: string;
  readonly totalSettled: number;
  readonly pendingAmount: number;
  readonly currency: string;
  readonly settlementCount: number;
};

function mapStatusBadge(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "settled": return "success";
    case "processing": return "warning";
    case "failed": case "reversed": return "error";
    default: return "neutral";
  }
}

function mapStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending";
    case "processing": return "Processing";
    case "settled": return "Settled";
    case "failed": return "Failed";
    case "reversed": return "Reversed";
    default: return status;
  }
}

function toView(s: WltSettlementRaw): DshWltSettlementView {
  return {
    id: s.id,
    partnerId: s.partnerId,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    statusLabel: mapStatusLabel(s.status),
    statusBadge: mapStatusBadge(s.status),
    netAmountLabel: String(s.netAmount),
    currency: s.currency,
    orderCount: s.orderCount,
    settledAt: s.settledAt,
  };
}

export async function fetchDshWltSettlementsByPartner(
  partnerId: string,
): Promise<{ ok: true; views: DshWltSettlementView[] } | { ok: false; message: string }> {
  try {
    const body = await wltGet<{ settlements: WltSettlementRaw[] }>(
      `/dsh/control-panel/finance/settlements?partnerId=${encodeURIComponent(partnerId)}`,
    );
    return { ok: true, views: body.settlements.map(toView) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function fetchDshWltSettlementSummary(
  partnerId: string,
): Promise<{ ok: true; view: DshWltSettlementSummaryView } | { ok: false; message: string }> {
  try {
    const body = await wltGet<{ summary: WltSettlementSummaryRaw }>(
      `/dsh/control-panel/finance/settlements/summary?partnerId=${encodeURIComponent(partnerId)}`,
    );
    const s = body.summary;
    return {
      ok: true,
      view: {
        partnerId: s.partnerId,
        totalSettledLabel: String(s.totalSettled),
        pendingAmountLabel: String(s.pendingAmount),
        currency: s.currency,
        settlementCount: s.settlementCount,
      },
    };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}
