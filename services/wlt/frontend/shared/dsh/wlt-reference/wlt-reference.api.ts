import type {
  WltPaymentStatusReference,
  WltDshPaymentSessionReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "../finance-boundary/wlt-dsh-boundary.types";
import type { WltDshReferenceContext } from "../finance-boundary/wlt-dsh-boundary.types";
import { dshFetchJson } from "../dsh-http/dsh-http-request";
export type { DshReferenceApiResult } from "../dsh-http/dsh-http-request";

export async function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string
) {
  return dshFetchJson<WltPaymentStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/payment-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as any).reference as WltPaymentStatusReference,
  );
}

export async function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string
) {
  return dshFetchJson<WltSettlementStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/settlement-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as any).reference as WltSettlementStatusReference,
  );
}

export async function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string
) {
  return dshFetchJson<WltRefundStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/refund-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as any).reference as WltRefundStatusReference,
  );
}
