import type {
  WltPaymentStatusReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "../finance-boundary/wlt-dsh-boundary.types";
import { dshFetchJson } from "../dsh-link/dsh-reference-request";
export type { DshReferenceApiResult } from "../dsh-link/dsh-reference-request";

export async function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string,
) {
  return dshFetchJson<WltPaymentStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/payment-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as { reference: WltPaymentStatusReference }).reference,
  );
}

export async function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string,
) {
  return dshFetchJson<WltSettlementStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/settlement-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as { reference: WltSettlementStatusReference }).reference,
  );
}

export async function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string,
) {
  return dshFetchJson<WltRefundStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/refund-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as { reference: WltRefundStatusReference }).reference,
  );
}
