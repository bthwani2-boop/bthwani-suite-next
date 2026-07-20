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

function classified(
  kind: ClassifiedCancellationError["kind"],
  message: string,
  code?: string,
): ClassifiedCancellationError {
  return code === undefined ? { kind, message } : { kind, code, message };
}

export function classifyCancellationError(error: unknown): ClassifiedCancellationError {
  const typed = error as {
    kind?: string;
    status?: number;
    code?: string;
    message?: string;
  };
  if (typed.kind === "network") {
    return classified("offline", "تعذر الاتصال بخدمة الطلبات.");
  }
  if (typed.kind === "http") {
    if (typed.code === "CANCELLATION_REQUIRES_REVIEW") {
      return classified(
        "requires_review",
        typed.message ?? "بدأ تجهيز الطلب ويتطلب الإلغاء مراجعة العمليات.",
        typed.code,
      );
    }
    if (typed.status === 401 || typed.status === 403) {
      return classified("permission_denied", "لا تملك صلاحية إلغاء هذا الطلب.", typed.code);
    }
    if (typed.status === 404) {
      return classified("not_found", "الطلب غير موجود ضمن نطاقك.", typed.code);
    }
    if (typed.status === 409) {
      return classified(
        "conflict",
        typed.message ?? "تغيّرت حالة الطلب ولا تسمح بالإلغاء الآن.",
        typed.code,
      );
    }
    if (typed.status === 400 || typed.status === 422) {
      return classified(
        "invalid",
        typed.message ?? "بيانات الإلغاء غير مكتملة.",
        typed.code,
      );
    }
  }
  return classified(
    "error",
    typed.message ?? "تعذر تنفيذ إلغاء الطلب.",
    typed.code,
  );
}
