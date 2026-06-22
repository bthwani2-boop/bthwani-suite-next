import type {
  WltPaymentStatusReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "./wlt-dsh-boundary.types";

export type WltReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly message: string };

export async function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string
): Promise<WltReferenceApiResult<WltPaymentStatusReference>> {
  try {
    const res = await fetch(
      `${baseUrl}/wlt/references/payment-status?orderId=${encodeURIComponent(orderId)}`
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.reference as WltPaymentStatusReference };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

export async function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string
): Promise<WltReferenceApiResult<WltSettlementStatusReference>> {
  try {
    const res = await fetch(
      `${baseUrl}/wlt/references/settlement-status?orderId=${encodeURIComponent(orderId)}`
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.reference as WltSettlementStatusReference };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

export async function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string
): Promise<WltReferenceApiResult<WltRefundStatusReference>> {
  try {
    const res = await fetch(
      `${baseUrl}/wlt/references/refund-status?orderId=${encodeURIComponent(orderId)}`
    );
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, data: body.reference as WltRefundStatusReference };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}
