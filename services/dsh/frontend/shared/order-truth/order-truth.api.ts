import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient, type DshRequestOptions } from "../_kernel/dsh-http-request";
import type {
  CreateOrderTruthInput,
  OrderTruth,
  OrderTruthActor,
  OrderTruthFailure,
  OrderTruthMutationContext,
} from "./order-truth.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "order-truth", 12000);

function withOptionalToken(
  options: Omit<DshRequestOptions, "token">,
  token?: string,
): DshRequestOptions {
  return token === undefined ? options : { ...options, token };
}

export async function createOrderTruth(
  input: CreateOrderTruthInput,
  context: OrderTruthMutationContext,
  token?: string,
): Promise<OrderTruth> {
  const data = await request<{ order: OrderTruth }>("/dsh/client/order-truth", withOptionalToken({
    method: "POST",
    body: { checkoutIntentId: input.checkoutIntentId.trim() },
    idempotencyKey: context.idempotencyKey,
    correlationId: context.correlationId,
  }, token));
  return data.order;
}

export async function fetchClientOrderTruth(token?: string): Promise<readonly OrderTruth[]> {
  const data = await request<{ orders: OrderTruth[] }>(
    "/dsh/client/order-truth",
    withOptionalToken({}, token),
  );
  return data.orders ?? [];
}

export async function fetchClientOrderTruthDetail(
  orderId: string,
  token?: string,
): Promise<OrderTruth> {
  const data = await request<{ order: OrderTruth }>(
    `/dsh/client/order-truth/${encodeURIComponent(orderId)}`,
    withOptionalToken({}, token),
  );
  return data.order;
}

export async function fetchClientOrderTruthEvents(
  orderId: string,
  token?: string,
): Promise<OrderTruth["statusTimeline"]> {
  const data = await request<{ events: OrderTruth["statusTimeline"] }>(
    `/dsh/client/order-truth/${encodeURIComponent(orderId)}/events`,
    withOptionalToken({}, token),
  );
  return data.events ?? [];
}

export async function fetchPartnerOrderTruth(
  input: { readonly status?: string; readonly limit?: number } = {},
  token?: string,
): Promise<readonly OrderTruth[]> {
  const params = new URLSearchParams();
  if (input.status?.trim()) params.set("status", input.status.trim());
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  const query = params.toString();
  const data = await request<{ orders: OrderTruth[] }>(
    `/dsh/partner/order-truth${query ? `?${query}` : ""}`,
    withOptionalToken({}, token),
  );
  return data.orders ?? [];
}

export async function fetchPartnerOrderTruthDetail(
  orderId: string,
  token?: string,
): Promise<OrderTruth> {
  const data = await request<{ order: OrderTruth }>(
    `/dsh/partner/order-truth/${encodeURIComponent(orderId)}`,
    withOptionalToken({}, token),
  );
  return data.order;
}

export async function fetchOperatorOrderTruth(
  input: { readonly status?: string; readonly limit?: number } = {},
  token?: string,
): Promise<readonly OrderTruth[]> {
  const params = new URLSearchParams();
  if (input.status?.trim()) params.set("status", input.status.trim());
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  const query = params.toString();
  const data = await request<{ orders: OrderTruth[] }>(
    `/dsh/operator/order-truth${query ? `?${query}` : ""}`,
    withOptionalToken({}, token),
  );
  return data.orders ?? [];
}

export async function fetchOperatorOrderTruthDetail(
  orderId: string,
  token?: string,
): Promise<OrderTruth> {
  const data = await request<{ order: OrderTruth }>(
    `/dsh/operator/order-truth/${encodeURIComponent(orderId)}`,
    withOptionalToken({}, token),
  );
  return data.order;
}

export function classifyOrderTruthFailure(error: unknown, actor: OrderTruthActor): OrderTruthFailure {
  const typed = error as { kind?: string; status?: number; code?: string; message?: string };
  if (typed.kind === "network") {
    return { kind: "offline", message: "تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة." };
  }
  if (typed.kind === "http") {
    if (typed.status === 401 || typed.status === 403) {
      return { kind: "forbidden", message: "لا تملك الجلسة الحالية صلاحية قراءة حقيقة الطلب." };
    }
    if (typed.status === 404) {
      return { kind: "not_found", message: "الطلب غير موجود أو خارج نطاق الحساب الحالي." };
    }
    if (typed.status === 409) {
      const idempotency = typed.code === "IDEMPOTENCY_KEY_REUSED";
      return {
        kind: "conflict",
        message: idempotency
          ? "تعذر إكمال الطلب لأن مفتاح المحاولة مرتبط بطلب مختلف."
          : "تغيرت حالة Checkout أو الطلب بالتزامن. حدّث البيانات ثم أعد المحاولة.",
      };
    }
  }
  return {
    kind: "error",
    message: actor === "client"
      ? "تعذر تحميل طلباتك من المصدر التشغيلي."
      : "تعذر تحميل حقيقة الطلبات للنطاق التشغيلي الحالي.",
  };
}
