import { getIdentityAccessToken } from "@bthwani/core-identity";
import type { DshWltSettlementView, DshWltSettlementSummaryView } from "./wlt-settlement.types";

const wltBaseUrl = (() => {
  if (typeof process !== "undefined" && process.env?.WLT_API_URL) {
    return process.env.WLT_API_URL.replace(/\/$/, "");
  }
  return "http://localhost:58083";
})();

let corrCounter = 0;
function corrId() {
  return `wlt-settlement-${Date.now()}-${++corrCounter}`;
}

async function wltGet<T>(path: string): Promise<T> {
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  let response: Response;
  try {
    response = await fetch(new URL(path, wltBaseUrl), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": corrId(),
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw { kind: "network", message: error instanceof Error ? error.message : "network error" };
  }
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  return response.json() as Promise<T>;
}

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
      `/wlt/settlements?partnerId=${encodeURIComponent(partnerId)}`,
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
      `/wlt/settlements/summary?partnerId=${encodeURIComponent(partnerId)}`,
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
