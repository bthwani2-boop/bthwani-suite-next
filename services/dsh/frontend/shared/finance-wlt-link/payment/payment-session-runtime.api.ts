import type {
  WltPaymentOperationEnvelope,
  WltPaymentTimelineEnvelope,
} from "@bthwani/wlt";
import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "payment-session-ops", 12000);

export type PaymentSessionRuntimeError = {
  readonly state: "offline" | "forbidden" | "not_found" | "conflict" | "error";
  readonly code: string;
  readonly message: string;
};

function classify(error: unknown): PaymentSessionRuntimeError {
  const value = error as { readonly kind?: string; readonly status?: number; readonly code?: string; readonly message?: string };
  if (value.kind === "network") {
    return { state: "offline", code: "NETWORK_ERROR", message: "تعذر الوصول إلى DSH. احتفظ بالمعرّفات وأعد المحاولة بعد عودة الاتصال." };
  }
  if (value.status === 401 || value.status === 403) {
    return { state: "forbidden", code: value.code ?? "FORBIDDEN", message: "لا تملك الجلسة الحالية صلاحية قراءة أو إدارة جلسة الدفع." };
  }
  if (value.status === 404) {
    return { state: "not_found", code: value.code ?? "NOT_FOUND", message: "لم تُعثر جلسة الدفع داخل المستأجر المحدد." };
  }
  if (value.status === 409) {
    return { state: "conflict", code: value.code ?? "CONFLICT", message: value.message ?? "الجلسة في انتقال مالي لا يسمح بتكرار العملية." };
  }
  return { state: "error", code: value.code ?? `HTTP_${value.status ?? "ERROR"}`, message: value.message ?? "تعذر تحميل الحقيقة المالية الحاكمة." };
}

function timelinePath(paymentSessionId: string, tenantId: string): string {
  return `/dsh/control-panel/finance/payment-sessions/${encodeURIComponent(paymentSessionId)}/timeline?tenantId=${encodeURIComponent(tenantId)}`;
}

export async function loadPaymentSessionTimeline(
  paymentSessionId: string,
  tenantId: string,
): Promise<{ readonly ok: true; readonly data: WltPaymentTimelineEnvelope } | { readonly ok: false; readonly error: PaymentSessionRuntimeError }> {
  try {
    const data = await request<WltPaymentTimelineEnvelope>(timelinePath(paymentSessionId, tenantId));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: classify(error) };
  }
}

export async function refreshPaymentSessionProviderStatus(
  paymentSessionId: string,
  tenantId: string,
): Promise<{ readonly ok: true; readonly data: WltPaymentOperationEnvelope } | { readonly ok: false; readonly error: PaymentSessionRuntimeError }> {
  const correlationId = corrId("payment-status-refresh");
  try {
    const data = await request<WltPaymentOperationEnvelope>(
      `/dsh/control-panel/finance/payment-sessions/${encodeURIComponent(paymentSessionId)}/refresh-provider-status?tenantId=${encodeURIComponent(tenantId)}`,
      {
        method: "POST",
        correlationId,
        idempotencyKey: `payment-refresh-${paymentSessionId}-${correlationId}`,
      },
    );
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: classify(error) };
  }
}
