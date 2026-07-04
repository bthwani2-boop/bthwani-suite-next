import { resolveWltApiBaseUrl } from "../../_kernel/wlt-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type { DshWltRefundView } from "./wlt-refund.types";

const { request: wltGet } = createDshHttpClient(resolveWltApiBaseUrl(), "wlt-refund");

type WltRefundRaw = {
  readonly id: string;
  readonly paymentSessionId: string;
  readonly orderId: string;
  readonly clientId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly reason: string;
  readonly status: string;
  readonly resolvedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

function mapStatusBadge(status: string): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "completed":
      return "success";
    case "approved":
    case "processing":
      return "warning";
    case "rejected":
    case "reversed":
      return "error";
    default:
      return "neutral";
  }
}

function mapStatusLabel(status: string): string {
  switch (status) {
    case "requested": return "Requested";
    case "approved": return "Approved";
    case "processing": return "Processing";
    case "completed": return "Completed";
    case "rejected": return "Rejected";
    case "reversed": return "Reversed";
    default: return status;
  }
}

function toView(r: WltRefundRaw): DshWltRefundView {
  return {
    id: r.id,
    orderId: r.orderId,
    statusLabel: mapStatusLabel(r.status),
    statusBadge: mapStatusBadge(r.status),
    amountLabel: String(r.amountMinorUnits),
    currency: r.currency,
    resolvedAt: r.resolvedAt,
  };
}

export async function fetchDshWltRefundView(
  refundId: string,
): Promise<{ ok: true; view: DshWltRefundView } | { ok: false; message: string }> {
  try {
    const body = await wltGet<{ refund: WltRefundRaw }>(
      `/wlt/refunds/${encodeURIComponent(refundId)}`,
    );
    return { ok: true, view: toView(body.refund) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}

export async function fetchDshWltRefundsByOrderView(
  orderId: string,
): Promise<{ ok: true; views: DshWltRefundView[] } | { ok: false; message: string }> {
  try {
    const body = await wltGet<{ refunds: WltRefundRaw[] }>(
      `/wlt/refunds?orderId=${encodeURIComponent(orderId)}`,
    );
    return { ok: true, views: body.refunds.map(toView) };
  } catch (e) {
    const err = e as { kind?: string; status?: number; message?: string };
    return { ok: false, message: err.message ?? `HTTP ${err.status ?? "error"}` };
  }
}
