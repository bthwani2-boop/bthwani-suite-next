import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { DshWltCodView, DshWltCommissionView } from "./wlt-cod.types";
import type { WltDshCodReference } from "@bthwani/wlt";
import type { WltReferenceApiResult } from "@bthwani/wlt/frontend/shared/dsh/wlt-dsh-http-request";

// WLT internal financial reads are service-authenticated; DSH surfaces read
// them through the governed DSH finance proxy, never from the browser.
const { request: wltGet } = createDshHttpClient(resolveDshApiBaseUrl(), "wlt-cod");

type WltCodRecordRaw = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: string;
  readonly collectedAt: string | null;
  readonly remittedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type WltCommissionRaw = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;
  readonly commissionType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: string;
  readonly settledAt: string | null;
  readonly createdAt: string;
};

function mapCodStatusBadge(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "remitted": return "success";
    case "collected": return "warning";
    case "disputed": return "error";
    default: return "neutral";
  }
}

function mapCodStatusLabel(status: string): string {
  switch (status) {
    case "pending_collection": return "Pending Collection";
    case "collected": return "Collected";
    case "remitted": return "Remitted";
    case "disputed": return "Disputed";
    case "resolved": return "Resolved";
    default: return status;
  }
}

function mapCommissionStatusBadge(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "settled": return "success";
    case "confirmed": return "warning";
    case "reversed": return "error";
    default: return "neutral";
  }
}

function mapCommissionStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pending";
    case "confirmed": return "Confirmed";
    case "settled": return "Settled";
    case "reversed": return "Reversed";
    default: return status;
  }
}

function mapCommissionTypeLabel(commissionType: string): string {
  switch (commissionType) {
    case "delivery_fee": return "Delivery Fee";
    case "platform_fee": return "Platform Fee";
    case "cod_fee": return "COD Fee";
    case "partner_discount": return "Partner Discount";
    default: return commissionType;
  }
}

function toCodView(r: WltCodRecordRaw): DshWltCodView {
  return {
    id: r.id,
    orderId: r.orderId,
    captainId: r.captainId,
    partnerId: r.partnerId,
    statusLabel: mapCodStatusLabel(r.status),
    statusBadge: mapCodStatusBadge(r.status),
    amountLabel: String(r.amountMinorUnits),
    currency: r.currency,
    collectedAt: r.collectedAt,
    remittedAt: r.remittedAt,
  };
}

function toCommissionView(c: WltCommissionRaw): DshWltCommissionView {
  return {
    id: c.id,
    orderId: c.orderId,
    captainId: c.captainId,
    partnerId: c.partnerId,
    commissionTypeLabel: mapCommissionTypeLabel(c.commissionType),
    statusLabel: mapCommissionStatusLabel(c.status),
    statusBadge: mapCommissionStatusBadge(c.status),
    amountLabel: String(c.amountMinorUnits),
    currency: c.currency,
    settledAt: c.settledAt,
  };
}

export async function fetchDshWltCodRecordsByCapitain(
  captainId: string,
): Promise<{ ok: true; views: DshWltCodView[] } | { ok: false; message: string }> {
  try {
    const body = await wltGet<{ codRecords: WltCodRecordRaw[] }>(
      `/dsh/control-panel/finance/cod-records?captainId=${encodeURIComponent(captainId)}`,
    );
    return { ok: true, views: body.codRecords.map(toCodView) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function fetchDshWltCommissionsByOrder(
  orderId: string,
): Promise<{ ok: true; views: DshWltCommissionView[] } | { ok: false; message: string }> {
  try {
    const body = await wltGet<{ commissions: WltCommissionRaw[] }>(
      `/dsh/control-panel/finance/commissions?orderId=${encodeURIComponent(orderId)}`,
    );
    return { ok: true, views: body.commissions.map(toCommissionView) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

// Captain self-view: the DSH backend locks the captain id to the
// authenticated actor, so no captainId parameter exists here by design.
export async function fetchDshCaptainOwnCodRecords(): Promise<WltReferenceApiResult<WltDshCodReference[]>> {
  try {
    const body = await wltGet<{ codRecords?: WltDshCodReference[] }>("/dsh/captain/finance/cod-records");
    return { ok: true, data: body.codRecords ?? [] };
  } catch (e) {
    const err = e as { kind?: string; status?: number; body?: string; message?: string };
    if (err.kind === "http") {
      return { ok: false, kind: "http", ...(err.status !== undefined ? { status: err.status } : {}), message: err.body || `HTTP ${err.status ?? "error"}` };
    }
    return { ok: false, kind: "network", message: err.message ?? "network error" };
  }
}
