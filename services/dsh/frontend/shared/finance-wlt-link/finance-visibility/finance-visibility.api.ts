import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { resolveWltApiBaseUrl } from "../../_kernel/wlt-api-base-url";
import { createDshHttpClient } from "../../_kernel/dsh-http-request";
import type {
  WltPaymentStatusRef,
  WltSettlementStatusRef,
  WltRefundStatusRef,
} from "./finance-visibility.types";

const { request: wltRequest } = createDshHttpClient(resolveWltApiBaseUrl(), "finance");
const { request: dshRequest } = createDshHttpClient(resolveDshApiBaseUrl(), "finance");

async function wltGet<T>(path: string): Promise<T> {
  try {
    return await wltRequest<T>(path);
  } catch (error) {
    const typed = error as { kind?: string; status?: number };
    if (typed.kind === "http" && (typed.status === 503 || typed.status === 502)) {
      throw { kind: "wlt_unavailable" };
    }
    throw error;
  }
}

export async function fetchWltPaymentStatus(orderId: string): Promise<WltPaymentStatusRef> {
  return wltGet<WltPaymentStatusRef>(`/wlt/references/payment-status?orderId=${encodeURIComponent(orderId)}`);
}

export async function fetchWltSettlementStatus(orderId: string): Promise<WltSettlementStatusRef> {
  return wltGet<WltSettlementStatusRef>(`/wlt/references/settlement-status?orderId=${encodeURIComponent(orderId)}`);
}

export async function fetchWltRefundStatus(orderId: string): Promise<WltRefundStatusRef> {
  return wltGet<WltRefundStatusRef>(`/wlt/references/refund-status?orderId=${encodeURIComponent(orderId)}`);
}

async function fetchAnalyticsPlatformKpis(period = "today"): Promise<unknown> {
  return dshRequest<unknown>(`/dsh/operator/analytics/platform?period=${period}`);
}
