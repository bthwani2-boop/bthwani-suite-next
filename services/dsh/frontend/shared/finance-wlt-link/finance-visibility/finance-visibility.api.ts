import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import type {
  WltPaymentStatusRef,
  WltSettlementStatusRef,
  WltRefundStatusRef,
} from "./finance-visibility.types";

const wltBaseUrl = (() => {
  if (typeof process !== "undefined" && process.env?.WLT_API_URL) {
    return process.env.WLT_API_URL.replace(/\/$/, "");
  }
  return "http://localhost:58083";
})();

let corrCounter = 0;
function corrId() {
  return `finance-${Date.now()}-${++corrCounter}`;
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
  if (response.status === 503 || response.status === 502) {
    throw { kind: "wlt_unavailable" };
  }
  if (!response.ok) {
    throw { kind: "http", status: response.status, body: await response.text().catch(() => "") };
  }
  return response.json() as Promise<T>;
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

export async function fetchAnalyticsPlatformKpis(period = "today"): Promise<unknown> {
  const dshBase = resolveDshApiBaseUrl();
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };
  const response = await fetch(new URL(`/dsh/operator/analytics/platform?period=${period}`, dshBase), {
    headers: { Authorization: `Bearer ${token}`, "X-Correlation-ID": corrId() },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  return response.json();
}
