import { resolveDshApiBaseUrl } from "../../_kernel/dsh-api-base-url";
import { createDshHttpClient, corrId } from "../../_kernel/dsh-http-request";
import type {
  CreateDshWltRefundInput,
  DshWltRefundAuditEvent,
  DshWltRefundFailureKind,
  DshWltRefundResult,
  DshWltRefundStatus,
  DshWltRefundView,
  RefundDecisionInput,
  RefundReconciliationInput,
} from "./wlt-refund.types";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "wlt-refund");

type WltRefundRaw = {
  readonly id: string;
  readonly operatorContextId?: string;
  readonly paymentSessionId?: string;
  readonly orderId: string;
  readonly clientId?: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly reason?: string;
  readonly status: string;
  readonly requestedByOperatorId?: string;
  readonly approvedByOperatorId?: string;
  readonly rejectedByOperatorId?: string;
  readonly decisionReason?: string;
  readonly eligibilityReference?: string;
  readonly providerReference?: string;
  readonly providerStatus?: string;
  readonly reconciliationCaseId?: string;
  readonly resolvedAt: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

type RefundEnvelope = { readonly refund: WltRefundRaw; readonly replayed?: boolean };
type RefundMutationEnvelope = Partial<RefundEnvelope> & {
  readonly code?: string;
  readonly message?: string;
};
type RefundListEnvelope = { readonly refunds: readonly WltRefundRaw[] };
type RefundAuditEnvelope = { readonly auditEvents: readonly DshWltRefundAuditEvent[] };

function invalidRefundResponse(message: string): never {
  throw { code: "INVALID_REFUND_RESPONSE", message };
}

function normalizeStatus(status: string): DshWltRefundStatus {
  switch (status) {
    case "requested":
    case "approved":
    case "processing":
    case "provider_unknown":
    case "completed":
    case "rejected":
    case "reversed":
      return status;
    default:
      return invalidRefundResponse(`أعاد الخادم حالة استرداد غير معروفة: ${status || "empty"}.`);
  }
}

function mapStatusBadge(status: DshWltRefundStatus): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "completed":
      return "success";
    case "approved":
    case "processing":
    case "provider_unknown":
      return "warning";
    case "rejected":
    case "reversed":
      return "error";
    default:
      return "neutral";
  }
}

function mapStatusLabel(status: DshWltRefundStatus): string {
  switch (status) {
    case "requested": return "بانتظار المراجعة";
    case "approved": return "معتمد";
    case "processing": return "قيد التنفيذ لدى المزود";
    case "provider_unknown": return "نتيجة المزود غير محسومة";
    case "completed": return "مسترد";
    case "rejected": return "مرفوض";
    case "reversed": return "معكوس";
  }
}

function toView(raw: WltRefundRaw): DshWltRefundView {
  if (!raw || typeof raw !== "object") {
    return invalidRefundResponse("أعاد الخادم استجابة استرداد غير صالحة.");
  }
  if (typeof raw.id !== "string" || !raw.id.trim()) {
    return invalidRefundResponse("استجابة الاسترداد لا تحتوي معرّفًا صالحًا.");
  }
  if (typeof raw.orderId !== "string" || !raw.orderId.trim()) {
    return invalidRefundResponse("استجابة الاسترداد لا تحتوي معرّف طلب صالحًا.");
  }
  if (!Number.isSafeInteger(raw.amountMinorUnits) || raw.amountMinorUnits < 0) {
    return invalidRefundResponse("استجابة الاسترداد تحتوي مبلغًا غير صالح.");
  }
  if (typeof raw.currency !== "string" || !raw.currency.trim()) {
    return invalidRefundResponse("استجابة الاسترداد لا تحتوي عملة صالحة.");
  }
  if (typeof raw.status !== "string") {
    return invalidRefundResponse("استجابة الاسترداد لا تحتوي حالة صالحة.");
  }
  if (raw.resolvedAt !== null && typeof raw.resolvedAt !== "string") {
    return invalidRefundResponse("استجابة الاسترداد تحتوي وقت حسم غير صالح.");
  }

  const status = normalizeStatus(raw.status);
  return {
    id: raw.id,
    orderId: raw.orderId,
    paymentSessionId: raw.paymentSessionId,
    clientId: raw.clientId,
    status,
    statusLabel: mapStatusLabel(status),
    statusBadge: mapStatusBadge(status),
    amountMinorUnits: raw.amountMinorUnits,
    amountLabel: String(raw.amountMinorUnits),
    currency: raw.currency,
    reason: raw.reason,
    eligibilityReference: raw.eligibilityReference,
    providerReference: raw.providerReference,
    providerStatus: raw.providerStatus,
    reconciliationCaseId: raw.reconciliationCaseId,
    requestedByOperatorId: raw.requestedByOperatorId,
    approvedByOperatorId: raw.approvedByOperatorId,
    rejectedByOperatorId: raw.rejectedByOperatorId,
    decisionReason: raw.decisionReason,
    resolvedAt: raw.resolvedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toRefundList(body: RefundListEnvelope): readonly DshWltRefundView[] {
  if (!body || !Array.isArray(body.refunds)) {
    return invalidRefundResponse("أعاد الخادم قائمة استردادات غير صالحة.");
  }
  return body.refunds.map(toView);
}

function classifyFailure(error: unknown): { kind: DshWltRefundFailureKind; message: string } {
  const value = error as { kind?: string; status?: number; code?: string; message?: string };
  if (value.kind === "network") return { kind: "offline", message: "تعذر الاتصال بالخدمة المالية." };
  if (value.status === 401) return { kind: "unauthorized", message: "انتهت الجلسة أو لم يتم تسجيل الدخول." };
  if (value.status === 403) return { kind: "forbidden", message: value.message ?? "لا تملك صلاحية تنفيذ هذا الإجراء." };
  if (value.status === 409) return { kind: "conflict", message: value.message ?? "تعارضت العملية مع الحالة المالية الحالية." };
  if (value.status === 202 || value.code === "PROVIDER_RESULT_UNKNOWN") {
    return { kind: "provider_unknown", message: value.message ?? "لم تُحسم نتيجة المزود، وتم فتح مصالحة مالية." };
  }
  if (value.status === 400) return { kind: "invalid", message: value.message ?? "بيانات الاسترداد غير صالحة." };
  return { kind: "error", message: value.message ?? `تعذر تنفيذ العملية (${value.status ?? "unknown"}).` };
}

async function asResult<T>(operation: () => Promise<T>): Promise<DshWltRefundResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { ok: false, ...classifyFailure(error) };
  }
}

export async function fetchDshWltRefundView(refundId: string): Promise<DshWltRefundResult<DshWltRefundView>> {
  return asResult(async () => {
    const body = await request<RefundEnvelope>(`/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}`);
    return toView(body.refund);
  });
}

export async function fetchDshWltRefundsByOrderView(orderId: string): Promise<DshWltRefundResult<readonly DshWltRefundView[]>> {
  return asResult(async () => {
    const body = await request<RefundListEnvelope>(`/dsh/control-panel/finance/refunds?orderId=${encodeURIComponent(orderId)}`);
    return toRefundList(body);
  });
}

export async function fetchDshWltRefundAudit(refundId: string): Promise<DshWltRefundResult<readonly DshWltRefundAuditEvent[]>> {
  return asResult(async () => {
    const body = await request<RefundAuditEnvelope>(`/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}/audit`);
    if (!body || !Array.isArray(body.auditEvents)) {
      return invalidRefundResponse("أعاد الخادم سجل تدقيق استرداد غير صالح.");
    }
    return body.auditEvents;
  });
}

export async function createDshWltRefund(
  input: CreateDshWltRefundInput,
  idempotencyKey: string,
): Promise<DshWltRefundResult<DshWltRefundView>> {
  return asResult(async () => {
    const body = await request<RefundEnvelope>("/dsh/control-panel/finance/refunds", {
      method: "POST",
      body: input,
      idempotencyKey,
      correlationId: corrId("refund-create"),
    });
    return toView(body.refund);
  });
}

async function decideRefund(
  refundId: string,
  action: "approve" | "reject",
  input: RefundDecisionInput,
  idempotencyKey: string,
): Promise<DshWltRefundResult<DshWltRefundView>> {
  return asResult(async () => {
    const body = await request<RefundEnvelope>(`/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}/${action}`, {
      method: "POST",
      body: input,
      idempotencyKey,
      correlationId: corrId(`refund-${action}`),
    });
    return toView(body.refund);
  });
}

export function approveDshWltRefund(refundId: string, input: RefundDecisionInput, idempotencyKey: string) {
  return decideRefund(refundId, "approve", input, idempotencyKey);
}

export function rejectDshWltRefund(refundId: string, input: RefundDecisionInput, idempotencyKey: string) {
  return decideRefund(refundId, "reject", input, idempotencyKey);
}

export async function completeDshWltRefund(refundId: string, idempotencyKey: string): Promise<DshWltRefundResult<DshWltRefundView>> {
  try {
    const body = await request<RefundMutationEnvelope>(`/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}/complete`, {
      method: "POST",
      body: {},
      idempotencyKey,
      correlationId: corrId("refund-complete"),
    });
    if (body.refund) return { ok: true, value: toView(body.refund) };
    if (body.code === "PROVIDER_RESULT_UNKNOWN") {
      return {
        ok: false,
        kind: "provider_unknown",
        message: body.message ?? "لم تُحسم نتيجة المزود، وتم فتح مصالحة مالية.",
      };
    }
    return { ok: false, kind: "error", message: body.message ?? "أعاد الخادم نتيجة تنفيذ غير مكتملة." };
  } catch (error) {
    return { ok: false, ...classifyFailure(error) };
  }
}

export async function reconcileDshWltRefund(
  refundId: string,
  input: RefundReconciliationInput,
  idempotencyKey: string,
): Promise<DshWltRefundResult<DshWltRefundView>> {
  return asResult(async () => {
    const body = await request<RefundEnvelope>(`/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}/reconcile`, {
      method: "POST",
      body: input,
      idempotencyKey,
      correlationId: corrId("refund-reconcile"),
    });
    return toView(body.refund);
  });
}

export async function fetchClientOrderRefunds(orderId: string): Promise<DshWltRefundResult<readonly DshWltRefundView[]>> {
  return asResult(async () => {
    const body = await request<RefundListEnvelope>(`/dsh/client/orders/${encodeURIComponent(orderId)}/refunds`);
    return toRefundList(body);
  });
}

export async function fetchPartnerOrderRefunds(orderId: string): Promise<DshWltRefundResult<readonly DshWltRefundView[]>> {
  return asResult(async () => {
    const body = await request<RefundListEnvelope>(`/dsh/partner/orders/${encodeURIComponent(orderId)}/refunds`);
    return toRefundList(body);
  });
}
