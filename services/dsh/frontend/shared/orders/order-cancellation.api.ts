import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import {
  createDshHttpClient,
  corrId,
  type DshRequestOptions,
} from "../_kernel/dsh-http-request";
import type {
  CancelOrderInput,
  CancelOrderResponse,
  DshOrderCancellation,
  OrderCancellationSurface,
} from "./order-cancellation.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "order-cancellation");

function requestOptions(
  options: Omit<DshRequestOptions, "token">,
  token?: string,
): DshRequestOptions {
  return token === undefined ? options : { ...options, token };
}

function cancellationPath(
  surface: OrderCancellationSurface,
  orderId: string,
  action: "read" | "cancel",
): string {
  const encodedOrderId = encodeURIComponent(orderId);
  if (surface === "operator") {
    return `/dsh/operator/orders/${encodedOrderId}/cancellation`;
  }
  if (action === "cancel") {
    return `/dsh/${surface}/orders/${encodedOrderId}/cancel`;
  }
  return `/dsh/${surface}/orders/${encodedOrderId}/cancellation`;
}

export async function fetchOrderCancellation(
  surface: OrderCancellationSurface,
  orderId: string,
  token?: string,
): Promise<DshOrderCancellation | null> {
  try {
    const data = await request<{ cancellation: DshOrderCancellation }>(
      cancellationPath(surface, orderId, "read"),
      requestOptions({}, token),
    );
    return data.cancellation;
  } catch (error) {
    const typed = error as { kind?: string; status?: number };
    if (typed.kind === "http" && typed.status === 404) return null;
    throw error;
  }
}

export async function cancelOrder(
  surface: OrderCancellationSurface,
  orderId: string,
  input: CancelOrderInput,
  token?: string,
): Promise<CancelOrderResponse> {
  const commandId = input.commandId?.trim() || corrId(`${surface}-order-cancel`);
  const body = {
    reasonCode: input.reasonCode,
    reasonNote: input.reasonNote?.trim() ?? "",
    commandId,
    correlationId: input.correlationId?.trim() || commandId,
  };
  return request<CancelOrderResponse>(
    cancellationPath(surface, orderId, "cancel"),
    requestOptions({ method: "POST", body }, token),
  );
}

export type ClassifiedCancellationError = {
  readonly kind:
    | "requires_review"
    | "conflict"
    | "permission_denied"
    | "not_found"
    | "offline"
    | "invalid"
    | "error";
  readonly code?: string;
  readonly message: string;
};

export function classifyCancellationError(error: unknown): ClassifiedCancellationError {
  const typed = error as {
    kind?: string;
    status?: number;
    code?: string;
    message?: string;
  };
  if (typed.kind === "network") {
    return { kind: "offline", message: "تعذر الاتصال بخدمة الطلبات." };
  }
  if (typed.kind === "http") {
    if (typed.code === "CANCELLATION_REQUIRES_REVIEW") {
      return {
        kind: "requires_review",
        code: typed.code,
        message: typed.message ?? "بدأ تجهيز الطلب ويتطلب الإلغاء مراجعة العمليات.",
      };
    }
    if (typed.status === 401 || typed.status === 403) {
      return { kind: "permission_denied", code: typed.code, message: "لا تملك صلاحية إلغاء هذا الطلب." };
    }
    if (typed.status === 404) {
      return { kind: "not_found", code: typed.code, message: "الطلب غير موجود ضمن نطاقك." };
    }
    if (typed.status === 409) {
      return {
        kind: "conflict",
        code: typed.code,
        message: typed.message ?? "تغيّرت حالة الطلب ولا تسمح بالإلغاء الآن.",
      };
    }
    if (typed.status === 400 || typed.status === 422) {
      return {
        kind: "invalid",
        code: typed.code,
        message: typed.message ?? "بيانات الإلغاء غير مكتملة.",
      };
    }
  }
  return {
    kind: "error",
    code: typed.code,
    message: typed.message ?? "تعذر تنفيذ إلغاء الطلب.",
  };
}
